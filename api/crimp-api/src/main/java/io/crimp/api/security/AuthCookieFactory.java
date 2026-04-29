package io.crimp.api.security;

import io.crimp.domain.auth.AuthTokens;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * 인증 쿠키 생성·해제 헬퍼 (PR #94, F5 후속 — HttpOnly 쿠키 전환).
 *
 * <p>웹 클라이언트가 토큰을 HttpOnly 쿠키로 받도록 백엔드가 응답에 Set-Cookie 헤더를 첨부.
 * 모바일 앱은 본 쿠키를 무시하고 JSON body 의 토큰을 그대로 사용한다 (둘 다 발행되어 호환).
 *
 * <p>refresh 쿠키는 {@code Path=/api/v1/auth} 로 좁혀 다른 경로로의 자동 첨부를 방지 —
 * 일반 API 호출은 access 쿠키만 보내면 된다.
 */
@Component
@Profile("!test")
public class AuthCookieFactory {

    /** refresh 쿠키 경로 — auth 엔드포인트에서만 보내도록 좁혀 일반 호출에서 누설 차단. */
    private static final String REFRESH_PATH = "/api/v1/auth";

    private final AuthCookieProperties props;

    public AuthCookieFactory(AuthCookieProperties props) {
        this.props = props;
    }

    /**
     * AuthTokens 의 access/refresh 두 쿠키를 응답에 부착.
     * 각각 토큰 자체 TTL 과 동일한 Max-Age 로 설정.
     */
    public void setAuthCookies(HttpServletResponse response, AuthTokens tokens) {
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie(tokens.accessToken(), tokens.accessTtlSeconds()).toString());
        // refresh 토큰의 실제 TTL 은 AuthTokens 에 노출되어 있지 않다 — JwtProperties 의
        // refresh-ttl 과 동일. 쿠키 만료를 토큰보다 짧게 잡고 싶으면 별도 설정 추가 가능.
        // 기본 14 일.
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie(tokens.refreshToken(), Duration.ofDays(14).getSeconds()).toString());
    }

    /** 두 쿠키를 즉시 만료(Max-Age=0)로 덮어써 클라가 보유한 쿠키를 제거. logout 흐름. */
    public void clearAuthCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie("", 0).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie("", 0).toString());
    }

    private ResponseCookie accessCookie(String value, long maxAgeSeconds) {
        return baseCookie(props.accessName(), value, maxAgeSeconds, "/").build();
    }

    private ResponseCookie refreshCookie(String value, long maxAgeSeconds) {
        return baseCookie(props.refreshName(), value, maxAgeSeconds, REFRESH_PATH).build();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String name, String value, long maxAgeSeconds, String path) {
        ResponseCookie.ResponseCookieBuilder b = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(props.secure())
                .sameSite(props.sameSite())
                .path(path)
                .maxAge(maxAgeSeconds);
        if (props.domain() != null && !props.domain().isBlank()) {
            b.domain(props.domain());
        }
        return b;
    }

    /** 쿠키 이름 노출 — 필터에서 access 쿠키 읽을 때 동일 이름 사용. */
    public String accessCookieName() {
        return props.accessName();
    }

    public String refreshCookieName() {
        return props.refreshName();
    }
}
