import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { COOKIE_AUTH_ACCESS_TOKEN, useTokenStore } from '@/store/tokenStore';

import { apiRequest } from './client';

const PayloadSchema = z.object({ ok: z.boolean() });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiRequest cookie auth', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useTokenStore.setState({
      accessToken: COOKIE_AUTH_ACCESS_TOKEN,
      refreshToken: null,
      cookieAuthCandidate: false,
      hydrated: true,
    });
  });

  it('sends cookies and omits Authorization when using cookie-auth sentinel', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: true,
        data: { ok: true },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiRequest({
        path: '/api/v1/me',
        accessToken: COOKIE_AUTH_ACCESS_TOKEN,
        schema: PayloadSchema,
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/me',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  });

  it('refreshes through HttpOnly cookie when no refresh token is in memory', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: false,
            error: { code: 'AUTH_INVALID', message: 'expired' },
          },
          401,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: true,
          data: {
            accessToken: 'fresh-access',
            refreshToken: 'fresh-refresh',
            expiresIn: 900,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: true,
          data: { ok: true },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiRequest({
        path: '/api/v1/me',
        accessToken: COOKIE_AUTH_ACCESS_TOKEN,
        schema: PayloadSchema,
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8080/api/v1/auth/refresh',
      expect.objectContaining({
        body: undefined,
        credentials: 'include',
      }),
    );
    expect(useTokenStore.getState()).toMatchObject({
      accessToken: 'fresh-access',
      refreshToken: null,
    });
  });
});
