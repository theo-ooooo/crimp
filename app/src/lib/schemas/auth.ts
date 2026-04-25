import { z } from 'zod';

/**
 * 인증 관련 응답 스키마.
 *
 * 참조: api/crimp-api/src/main/java/io/crimp/api/auth/AuthController.java
 *
 * 백엔드 `TokenResponse` record 는 `(accessToken, refreshToken, expiresIn)` 의
 * 3-필드 구조다. `expiresIn` 은 access 토큰의 TTL(초) 이며, 별도의
 * `accessTokenExpiresAt` / `refreshTokenExpiresAt` 절대시각 필드는 노출되지 않는다.
 *
 * 클라이언트에서 절대 만료시각이 필요해지면, 응답 수신 직후
 * `Date.now() + expiresIn * 1000` 으로 계산해 보관한다.
 */
export const TokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().nonnegative(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

/**
 * `POST /api/v1/auth/oauth/{provider}` 의 요청 본문.
 */
export type OauthExchangeBody = {
  idToken: string;
};

/**
 * `POST /api/v1/auth/refresh` / `POST /api/v1/auth/logout` 의 요청 본문.
 */
export type TokenPairBody = {
  refreshToken: string;
};

/**
 * 백엔드가 지원하는 OAuth provider. 백엔드 `OauthProvider` enum 과 1:1 대응.
 */
export type OauthProvider = 'KAKAO' | 'APPLE' | 'GOOGLE';
