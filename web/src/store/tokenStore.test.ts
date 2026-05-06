import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  COOKIE_AUTH_ACCESS_TOKEN,
  isCookieAuthAccessToken,
  useTokenStore,
} from './tokenStore';

describe('web tokenStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(Storage.prototype, 'getItem');
    vi.spyOn(Storage.prototype, 'removeItem');
    useTokenStore.setState({
      accessToken: null,
      refreshToken: null,
      cookieAuthCandidate: false,
      hydrated: false,
    });
  });

  it('hydrates into cookie-auth mode and removes legacy plaintext tokens', () => {
    useTokenStore.getState().hydrate();

    expect(useTokenStore.getState()).toMatchObject({
      accessToken: null,
      refreshToken: null,
      cookieAuthCandidate: true,
      hydrated: true,
    });
    expect(window.localStorage.getItem).not.toHaveBeenCalled();
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('crimp.accessToken');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('crimp.refreshToken');
  });

  it('keeps only the access token in memory', () => {
    useTokenStore.getState().setTokens({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    expect(useTokenStore.getState()).toMatchObject({
      accessToken: 'access',
      refreshToken: null,
      cookieAuthCandidate: false,
    });
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });

  it('marks a validated HttpOnly cookie session as authenticated', () => {
    useTokenStore.setState({
      accessToken: null,
      refreshToken: null,
      cookieAuthCandidate: true,
      hydrated: true,
    });

    useTokenStore.getState().markCookieAuthenticated();

    expect(useTokenStore.getState()).toMatchObject({
      accessToken: COOKIE_AUTH_ACCESS_TOKEN,
      refreshToken: null,
      cookieAuthCandidate: false,
      hydrated: true,
    });
  });

  it('detects the cookie-auth sentinel', () => {
    expect(isCookieAuthAccessToken(COOKIE_AUTH_ACCESS_TOKEN)).toBe(true);
    expect(isCookieAuthAccessToken('real-token')).toBe(false);
    expect(isCookieAuthAccessToken(null)).toBe(false);
  });
});
