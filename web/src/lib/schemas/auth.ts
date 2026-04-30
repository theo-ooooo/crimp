import { z } from 'zod';

/**
 * 인증 관련 스키마.
 *
 * 참조:
 *  - `api/crimp-api/.../auth/AuthController.java` — `OauthExchangeRequest`, `TokenPair`, `TokenResponse`
 *  - `api/crimp-domain/.../auth/AuthTokens.java` — 도메인 모델 (`accessTtlSeconds` 가 `expiresIn` 으로 직렬화됨)
 *
 * 백엔드 응답:
 * ```json
 * { "accessToken": "...", "refreshToken": "...", "expiresIn": 900 }
 * ```
 *
 * `expiresIn` 은 access 토큰 TTL (초 단위, `long`). refresh TTL 은 응답에 포함되지
 * 않고 백엔드 설정 (`app.auth.jwt.refresh-ttl-seconds`) 으로 고정된다.
 */
export const TokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().nonnegative(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

/**
 * `POST /api/v1/auth/oauth/{provider}` 요청 본문.
 *
 * provider 의 OIDC `id_token` 을 그대로 전달한다. 서버에서 JWKS 로 서명 검증 후
 * 사용자 매칭/생성 → JWT 발급.
 */
export const OauthExchangeBodySchema = z.object({
  idToken: z.string().min(1),
});

export type OauthExchangeBody = z.infer<typeof OauthExchangeBodySchema>;

/**
 * `POST /api/v1/auth/refresh` / `POST /api/v1/auth/logout` 공통 본문.
 */
export const RefreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenBody = z.infer<typeof RefreshTokenBodySchema>;

/**
 * 지원 OAuth provider. 백엔드 `OauthProvider` enum 과 동기화.
 */
export const OauthProviderSchema = z.enum(['kakao', 'apple']);

export type OauthProvider = z.infer<typeof OauthProviderSchema>;
