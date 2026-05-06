import { t, type MessageKey } from '@/lib/i18n';

import { ApiError, ApiSchemaError, ApiTransportError } from './errors';

/**
 * 에러 → 사용자 문구 변환 (앱).
 *
 * `errors.ts` 상단 docstring 의 i18n 정책을 따른다.
 */

const CODE_TO_KEY: Record<string, MessageKey> = {
  AUTH_REQUIRED: 'error.authRequired',
  AUTH_EXPIRED: 'error.authExpired',
  // PR #104 리뷰: OAuth id_token 검증 실패 — Apple/Google/Kakao 모두 동일 코드 사용.
  // placeholder client-id 로 운영 시작했거나 audience 불일치, 만료 등에서 발생.
  AUTH_INVALID: 'error.authInvalid',
  AUTH_PROVIDER_UNSUPPORTED: 'error.authProviderUnsupported',
  AUTH_USER_MISSING: 'error.authUserMissing',
  FORBIDDEN: 'error.forbidden',
  FORBIDDEN_RESOURCE: 'error.forbidden',
  NOT_FOUND: 'error.notFound',
  NICKNAME_TAKEN: 'error.nicknameTaken',
  SESSION_NOT_FOUND: 'error.sessionNotFound',
  SESSION_INVALID: 'error.sessionInvalid',
  ATTEMPT_NOT_FOUND: 'error.attemptNotFound',
  ATTEMPT_INVALID: 'error.attemptInvalid',
  // PR #59: 주 암장 관련 백엔드 에러 코드.
  MAIN_GYM_NOT_FOUND: 'me.mainGym.errorNotFound',
  INVALID_MAIN_GYM_REQUEST: 'me.mainGym.errorInvalidRequest',
  // PR #90 / F5 PR-3: 미디어 업로드 백엔드 에러 코드 → 사용자 안내 분기 (PR #92 리뷰 I1).
  MEDIA_SIZE_TOO_LARGE: 'error.mediaSizeTooLarge',
  MEDIA_MIME_NOT_ALLOWED: 'error.mediaMimeNotAllowed',
  MEDIA_SIZE_INVALID: 'error.mediaSizeInvalid',
  MEDIA_KIND_INVALID: 'error.mediaMimeNotAllowed',
  MEDIA_FORBIDDEN: 'error.mediaForbidden',
  MEDIA_NOT_FOUND: 'error.mediaNotFound',
  MEDIA_INVALID_STATE: 'error.mediaInvalidState',
  AVATAR_MEDIA_NOT_FOUND: 'error.avatarMediaNotFound',
  AVATAR_MEDIA_FORBIDDEN: 'error.avatarMediaForbidden',
  AVATAR_MEDIA_INVALID: 'error.avatarMediaInvalid',
  INVALID_AVATAR_REQUEST: 'error.avatarInvalidRequest',
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
