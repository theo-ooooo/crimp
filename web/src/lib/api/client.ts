import type { ZodType } from 'zod';

import { ApiEnvelopeSchema } from '@/lib/schemas/error';

import { API_BASE_URL } from './config';
import { ApiError, ApiSchemaError, ApiTransportError } from './errors';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiRequest<TBody> {
  method?: HttpMethod;
  path: string;
  body?: TBody;
  /** 추가 헤더. `Authorization`, `Content-Type`, `Accept` 는 클라이언트가 자동 설정. */
  headers?: Record<string, string>;
  /** 호출 시 자동으로 붙일 Bearer 토큰 (선택). */
  accessToken?: string | null;
  /** 요청을 취소할 AbortSignal. */
  signal?: AbortSignal;
}

export interface ApiRequestWithSchema<TBody, TResponse> extends ApiRequest<TBody> {
  schema: ZodType<TResponse>;
}

/**
 * 공통 API 클라이언트.
 *
 * - URL 은 `API_BASE_URL + path` 로 조합. `path` 는 반드시 `/` 로 시작.
 * - `accessToken` 이 제공되면 `Authorization: Bearer <token>` 자동 삽입.
 * - 본문이 있으면 JSON 직렬화 + `Content-Type: application/json` 설정.
 * - 응답은 `ApiResponse<T>` envelope 으로 수신:
 *   - `{ status: true, data: ... }` → `data` 를 `schema` 로 검증 후 반환.
 *   - `{ status: false, error: ... }` → HTTP status 와 함께 `ApiError` throw (2xx 여도 동일).
 * - envelope 형태가 아닌 응답은 `ApiTransportError`, 스키마 검증 실패는 `ApiSchemaError`.
 * - 204 No Content: envelope 없이 빈 본문 (`DELETE` 등). 호출부가 `z.void()` 를 넘기면 `undefined` 반환.
 */
export async function apiRequest<TBody, TResponse>(
  options: ApiRequestWithSchema<TBody, TResponse>,
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
      credentials: 'omit',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'network error';
    throw new ApiTransportError(message, null, null);
  }

  const text = await response.text();

  if (!text) {
    // 204 No Content (DELETE 등) — envelope 없이 빈 본문.
    // 4xx/5xx 임에도 빈 바디라면 transport 에러로 간주한다.
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
    // HTTP 2xx 이면서 status:false 로 오는 경우도 동일하게 ApiError 로 처리.
    throw new ApiError(response.status, envelope.data.error);
  }

  const parsed = schema.safeParse(envelope.data.data);
  if (!parsed.success) {
    throw new ApiSchemaError('응답 스키마 검증 실패', parsed.error.issues);
  }
  return parsed.data;
}
