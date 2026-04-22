import type { ErrorBody } from '@/lib/schemas/error';

/**
 * 에러 메시지 i18n 정책:
 *
 * 이 파일과 `client.ts` 에서 `new Error(...)` / `new ApiTransportError(...)` /
 * `new ApiSchemaError(...)` 로 던지는 한국어 메시지는 **개발자용 진단 문자열**이며
 * 사용자 UI 에 직접 노출하지 않는다. 즉 UI 컴포넌트는 `error.message` 를
 * 그대로 렌더링하지 않고, 다음 규칙으로 사용자용 문구를 구성한다:
 *
 * - `ApiError` 인 경우: `error.code` 를 i18n 키로 맵핑해 번역된 메시지 표시
 *   (예: `AUTH_REQUIRED` → `t('error.authRequired')`). `error.message` 는 백엔드
 *   기본 메시지로 fallback 용도로만 사용.
 * - `ApiTransportError` / `ApiSchemaError` / 기타 `Error`: "일시적 오류가 발생했어요"
 *   같은 일반 문구 (`t('error.transport')`) 로 고정.
 *
 * 로깅·개발자 콘솔에는 원문 `error.message` 가 그대로 남아도 무방하다.
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
