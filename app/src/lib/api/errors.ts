import type { ErrorBody } from '@/lib/schemas/error';

/**
 * 서버가 표준 에러 envelope 로 응답한 경우 던지는 예외.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: Record<string, unknown> | null;

  constructor(status: number, body: ErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? null;
  }
}

/**
 * 응답 본문이 envelope 형태가 아니거나, fetch 자체 실패(네트워크) 시 던진다.
 */
export class ApiTransportError extends Error {
  public readonly status: number | null;
  public readonly rawBody: string | null;

  constructor(message: string, status: number | null, rawBody: string | null) {
    super(message);
    this.name = 'ApiTransportError';
    this.status = status;
    this.rawBody = rawBody;
  }
}

/**
 * 응답이 zod 스키마 파싱에 실패했을 때 사용.
 */
export class ApiSchemaError extends Error {
  public readonly issues: unknown;

  constructor(message: string, issues: unknown) {
    super(message);
    this.name = 'ApiSchemaError';
    this.issues = issues;
  }
}
