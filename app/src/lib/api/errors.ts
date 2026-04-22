import type { ErrorBody } from '@/lib/schemas/error';

/**
 * 에러 메시지 i18n 정책:
 *
 * 본 모듈과 `client.ts` 의 한국어 `Error` 메시지는 **개발자용 진단** 이며
 * UI 에 직접 노출 금지. 사용자 문구는 다음 규칙으로 구성한다:
 *
 * - `ApiError`: `error.code` 를 i18n 키로 맵핑 (`AUTH_REQUIRED` → `t('error.authRequired')` 등)
 * - `ApiTransportError` / `ApiSchemaError` / 기타 `Error`: 일반 문구로 고정
 *
 * 로깅·콘솔에는 원문 `error.message` 유지.
 */

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
