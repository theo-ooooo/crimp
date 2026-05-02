import { t, type MessageKey } from '@/lib/i18n';

import { ApiError, ApiSchemaError, ApiTransportError } from './errors';

/**
 * 에러 → 사용자 문구 변환.
 *
 * `errors.ts` 상단 docstring 의 i18n 정책을 따른다:
 *  - `ApiError`: `error.code` 를 i18n 키로 맵핑
 *  - `ApiTransportError` / `ApiSchemaError` / 기타: 일반 문구
 *
 * 미매핑 코드는 `error.generic` 로 fallback. raw message 는 노출하지 않는다.
 */

const CODE_TO_KEY: Record<string, MessageKey> = {
  AUTH_REQUIRED: 'error.authRequired',
  AUTH_EXPIRED: 'error.authExpired',
  FORBIDDEN: 'error.forbidden',
  FORBIDDEN_RESOURCE: 'error.forbidden',
  NOT_FOUND: 'error.notFound',
  NICKNAME_TAKEN: 'error.nicknameTaken',
  SESSION_NOT_FOUND: 'error.sessionNotFound',
  SESSION_INVALID: 'error.sessionInvalid',
  ATTEMPT_NOT_FOUND: 'error.attemptNotFound',
  ATTEMPT_INVALID: 'error.attemptInvalid',
  GYM_NOT_FOUND: 'error.gymNotFound',
  // PR #59 — 주 암장 contract 에러
  MAIN_GYM_NOT_FOUND: 'error.mainGymNotFound',
  INVALID_MAIN_GYM_REQUEST: 'error.mainGymInvalid',
};

export function toUserMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const key = CODE_TO_KEY[err.code];
    return key ? t(key) : t('error.generic');
  }
  if (err instanceof ApiTransportError || err instanceof ApiSchemaError) {
    return t('error.transport');
  }
  return t('error.transport');
}
