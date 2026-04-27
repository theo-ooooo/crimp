import type { ZodType } from 'zod';

import { TokenResponseSchema } from '@/lib/schemas/auth';
import { ApiEnvelopeSchema } from '@/lib/schemas/error';
import { useTokenStore } from '@/store/tokenStore';

import { API_BASE_URL } from './config';
import { ApiError, ApiSchemaError, ApiTransportError } from './errors';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** 401 시 refresh 흐름에서 사용할 백엔드 refresh 엔드포인트 경로. */
const REFRESH_PATH = '/api/v1/auth/refresh';

export interface ApiRequest<TBody> {
  method?: HttpMethod;
  path: string;
  body?: TBody;
  headers?: Record<string, string>;
  accessToken?: string | null;
  signal?: AbortSignal;
}

export interface ApiRequestWithSchema<TBody, TResponse> extends ApiRequest<TBody> {
  schema: ZodType<TResponse>;
}

/**
 * 진행 중인 refresh 요청 (있다면). 동시에 여러 요청이 401 을 받아도 refresh 호출은 1번만.
 *
 * 첫 401 이 refresh 시작 → 후속 401 들은 이 promise 를 join → 동일한 새 토큰으로 재시도.
 */
let inFlightRefresh:
  | Promise<{ accessToken: string; refreshToken: string; expiresIn: number }>
  | null = null;

/**
 * refresh 토큰으로 새 access·refresh 쌍을 받아온다. 실패 시 reject.
 *
 * `apiRequest` 와 분리한 이유:
 *  1) `endpoints.ts` 의 `refreshTokens` 를 부르면 모듈 순환 참조가 생긴다.
 *  2) refresh 호출 자체가 401 을 다시 트리거해 무한 재귀하는 것을 방지한다.
 */
async function postRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    throw new Error(`refresh failed: HTTP ${res.status}`);
  }
  const json: unknown = await res.json().catch(() => null);
  const envelope = ApiEnvelopeSchema.safeParse(json);
  if (!envelope.success || envelope.data.status === false) {
    throw new Error('refresh failed: invalid envelope');
  }
  // R1: 캐스트 대신 TokenResponseSchema 로 검증 — 잘못된 토큰을 그대로 store 에
  // 저장하는 사고 차단. 백엔드가 응답 shape 를 바꾸면 여기서 명확하게 실패한다.
  const parsed = TokenResponseSchema.safeParse(envelope.data.data);
  if (!parsed.success) {
    throw new Error('refresh failed: response did not match TokenResponse schema');
  }
  return {
    accessToken: parsed.data.accessToken,
    refreshToken: parsed.data.refreshToken,
    expiresIn: parsed.data.expiresIn,
  };
}

function ensureRefresh(refreshToken: string) {
  if (!inFlightRefresh) {
    inFlightRefresh = postRefresh(refreshToken).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

/**
 * 인증 만료가 회복 불가능할 때 호출. 토큰을 비우면 RootStack 이 자동으로 Login 으로 swap.
 *
 * RN 은 navigation ref 가 별도로 없어도 `App.tsx` 의 RootStack 이 `accessToken === null`
 * 분기를 감시하므로 store.clear() 만 호출해도 화면 전환이 일어난다.
 */
async function onAuthFailure(): Promise<void> {
  await useTokenStore.getState().clear();
}

/**
 * 공통 API 클라이언트 (React Native).
 *
 * - URL 은 `API_BASE_URL + path` 로 조합. `path` 는 반드시 `/` 로 시작.
 * - `accessToken` 이 제공되면 `Authorization: Bearer <token>` 자동 삽입.
 * - 본문이 있으면 JSON 직렬화 + `Content-Type: application/json` 설정.
 * - 응답은 `ApiResponse<T>` envelope 으로 수신:
 *   - `{ status: true, data: ... }` → `data` 를 `schema` 로 검증 후 반환.
 *   - `{ status: false, error: ... }` → HTTP status 와 함께 `ApiError` throw.
 * - 204 No Content: envelope 없이 빈 본문. `z.void()` 를 넘기면 `undefined` 반환.
 */
export async function apiRequest<TBody, TResponse>(
  options: ApiRequestWithSchema<TBody, TResponse>,
): Promise<TResponse> {
  return doRequest(options, false);
}

async function doRequest<TBody, TResponse>(
  options: ApiRequestWithSchema<TBody, TResponse>,
  retried: boolean,
): Promise<TResponse> {
  const { method = 'GET', path, body, headers, accessToken, schema, signal } = options;

  if (!path.startsWith('/')) {
    throw new Error(`apiRequest: path 는 '/' 로 시작해야 합니다 (got: ${path})`);
  }

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers ?? {}),
  };
  if (accessToken) {
    finalHeaders.Authorization = `Bearer ${accessToken}`;
  }

  let requestBody: string | undefined;
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: requestBody,
      signal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'network error';
    throw new ApiTransportError(message, null, null);
  }

  const text = await response.text();

  if (!text) {
    if (!response.ok) {
      throw new ApiTransportError(
        `HTTP ${response.status} (empty body)`,
        response.status,
        null,
      );
    }
    const parsed = schema.safeParse(undefined);
    if (!parsed.success) {
      throw new ApiSchemaError('응답 본문이 비어 있습니다', parsed.error.issues);
    }
    return parsed.data;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new ApiTransportError(
      `HTTP ${response.status} (non-JSON body)`,
      response.status,
      text,
    );
  }

  const envelope = ApiEnvelopeSchema.safeParse(parsedJson);
  if (!envelope.success) {
    throw new ApiTransportError(
      `HTTP ${response.status} (unexpected envelope)`,
      response.status,
      text,
    );
  }

  if (envelope.data.status === false) {
    // 401: access token 만료 — refresh 1회 시도 후 재요청.
    // 무한 루프 방지: refresh path 자체와 retried 요청, accessToken 미부착 요청은 우회.
    if (
      response.status === 401 &&
      Boolean(accessToken) &&
      path !== REFRESH_PATH
    ) {
      if (retried) {
        // refresh 직후에도 401 — backend 가 새 토큰을 거부했음. 재시도 의미 없음.
        await onAuthFailure();
        throw new ApiError(response.status, envelope.data.error);
      }
      const stored = useTokenStore.getState().refreshToken;
      if (!stored) {
        await onAuthFailure();
        throw new ApiError(response.status, envelope.data.error);
      }
      try {
        const fresh = await ensureRefresh(stored);
        await useTokenStore.getState().setTokens({
          accessToken: fresh.accessToken,
          refreshToken: fresh.refreshToken,
          expiresIn: fresh.expiresIn,
        });
        return doRequest({ ...options, accessToken: fresh.accessToken }, true);
      } catch (refreshErr) {
        // R1: 사일런트 실패 방지 — 진단을 위해 dev console 에 한 줄. UI 는 이미
        // RootStack 이 store.clear() 후 Login 으로 swap 하므로 추가 노출 없음.
        if (typeof console !== 'undefined') {
          console.warn('[apiRequest] refresh failed:', refreshErr);
        }
        await onAuthFailure();
        throw new ApiError(response.status, envelope.data.error);
      }
    }
    throw new ApiError(response.status, envelope.data.error);
  }

  // 백엔드가 `@JsonInclude(NON_NULL)` 로 직렬화하므로 payload 가 null 이면 `data` 키가
  // 누락되어 `envelope.data.data === undefined`. 비어있는 success 를 받을 가능성이 있는
  // 호출부는 스키마를 `z.void()` / `z.unknown().optional()` / `z.null()` 로 정의할 것.
  const parsed = schema.safeParse(envelope.data.data);
  if (!parsed.success) {
    throw new ApiSchemaError('응답 스키마 검증 실패', parsed.error.issues);
  }
  return parsed.data;
}
