package io.crimp.domain.auth;

/**
 * 발급된 access/refresh 토큰 쌍 + 각 TTL.
 *
 * <p>{@code refreshTtlSeconds} 는 PR #94 리뷰 S4 로 추가 — HttpOnly 쿠키 발행 시
 * Max-Age 를 토큰 TTL 과 동기화하기 위해. 이전엔 {@code AuthCookieFactory} 가 14일을
 * hardcoded 했으나 {@code JwtProperties.refreshTtlSeconds} 변경 시 어긋날 위험이 있었음.
 */
public record AuthTokens(
        String accessToken,
        String refreshToken,
        long accessTtlSeconds,
        long refreshTtlSeconds
) {}
