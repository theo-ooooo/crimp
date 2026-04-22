import type { ZodType } from 'zod';

import { ErrorResponseSchema } from '@/lib/schemas/error';

import { API_BASE_URL } from './config';
import { ApiError, ApiSchemaError, ApiTransportError } from './errors';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

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

async function parseErrorResponse(response: Response): Promise<never> {
  const text = await response.text();
  if (!text) {
    throw new ApiTransportError(
      `HTTP ${response.status} (empty body)`,
      response.status,
      null,
    );
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

  const envelope = ErrorResponseSchema.safeParse(parsedJson);
  if (!envelope.success) {
    throw new ApiTransportError(
      `HTTP ${response.status} (unexpected error envelope)`,
      response.status,
      text,
    );
  }
  throw new ApiError(response.status, envelope.data.error);
}

/**
 * 공통 API 클라이언트 (React Native).
 *
 * - URL 은 `API_BASE_URL + path` 로 조합. `path` 는 반드시 `/` 로 시작.
 * - `accessToken` 이 제공되면 `Authorization: Bearer <token>` 자동 삽입.
 * - 본문이 있으면 JSON 직렬화 + `Content-Type: application/json` 설정.
 * - 2xx 응답: zod 스키마로 런타임 검증, 실패 시 `ApiSchemaError`.
 * - 4xx/5xx: 에러 envelope 파싱 후 `ApiError`, 아니면 `ApiTransportError`.
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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'network error';
    throw new ApiTransportError(message, null, null);
  }

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  const text = await response.text();
  if (!text) {
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
    throw new ApiTransportError('응답 본문이 JSON 형식이 아닙니다', response.status, text);
  }

  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ApiSchemaError('응답 스키마 검증 실패', parsed.error.issues);
  }
  return parsed.data;
}
