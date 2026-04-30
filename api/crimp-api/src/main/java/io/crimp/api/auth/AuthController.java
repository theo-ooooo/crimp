package io.crimp.api.auth;

import io.crimp.api.security.AuthCookieFactory;
import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.core.entity.enums.OauthProvider;
import io.crimp.domain.auth.AuthException;
import io.crimp.domain.auth.AuthService;
import io.crimp.domain.auth.AuthTokens;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotBlank;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Profile("!test")
public class AuthController {

    private final AuthService authService;
    private final AuthCookieFactory cookieFactory;

    public AuthController(AuthService authService, AuthCookieFactory cookieFactory) {
        this.authService = authService;
        this.cookieFactory = cookieFactory;
    }

    @PostMapping("/oauth/{provider}")
    public TokenResponse exchange(
            @PathVariable String provider,
            @RequestBody OauthExchangeRequest req,
            HttpServletResponse response) {
        OauthProvider p = parseProvider(provider);
        AuthTokens tokens = authService.exchange(p, req.idToken(), req.nonce());
        // [PR #94] 웹은 HttpOnly 쿠키로 토큰을 보유. 모바일은 JSON body 의 토큰을 사용 (둘 다 발행).
        cookieFactory.setAuthCookies(response, tokens);
        return TokenResponse.of(tokens);
    }

    /**
     * 웹 v2 redirect flow 전용 — authorization_code 를 백엔드에서 provider 토큰
     * 엔드포인트로 교환 후 id_token 검증·JWT 발급.
     */
    @PostMapping("/oauth/{provider}/code")
    public TokenResponse exchangeCode(
            @PathVariable String provider,
            @RequestBody OauthCodeExchangeRequest req,
            HttpServletResponse response) {
        OauthProvider p = parseProvider(provider);
        AuthTokens tokens = authService.exchangeCode(p, req.code(), req.redirectUri(), req.nonce());
        cookieFactory.setAuthCookies(response, tokens);
        return TokenResponse.of(tokens);
    }

    /**
     * refresh 토큰으로 access/refresh 쌍 재발급. 본문 제공 시 우선, 없으면 쿠키에서 읽음
     * (웹 호환). 둘 다 없으면 400.
     */
    @PostMapping("/refresh")
    public TokenResponse refresh(
            @RequestBody(required = false) TokenPair req,
            HttpServletRequest request,
            HttpServletResponse response) {
        String refreshToken = req != null && req.refreshToken() != null && !req.refreshToken().isBlank()
                ? req.refreshToken()
                : readRefreshFromCookie(request);
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new AuthException("AUTH_INVALID", "refreshToken not provided");
        }
        AuthTokens tokens = authService.refresh(refreshToken);
        cookieFactory.setAuthCookies(response, tokens);
        return TokenResponse.of(tokens);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestBody(required = false) TokenPair req,
            HttpServletRequest request,
            HttpServletResponse response) {
        String refreshToken = req != null && req.refreshToken() != null && !req.refreshToken().isBlank()
                ? req.refreshToken()
                : readRefreshFromCookie(request);
        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken);
        }
        // 쿠키는 토큰 유무와 무관하게 항상 제거 — 클라가 갖고 있던 쿠키 청소.
        cookieFactory.clearAuthCookies(response);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuth(AuthException e) {
        int status = statusOf(e.code());
        return ResponseEntity.status(status).body(ApiResponse.failure(ErrorBody.of(e.code(), e.getMessage())));
    }

    /**
     * AuthException code → HTTP status 매핑.
     *
     * <ul>
     *   <li>{@code AUTH_PROVIDER_UNSUPPORTED} → 400</li>
     *   <li>{@code *_OAUTH_NOT_CONFIGURED} → 503 (외부 의존성 미구성, 일시적 503 으로 안내)</li>
     *   <li>그 외 인증 실패 → 401</li>
     * </ul>
     */
    private static int statusOf(String code) {
        if ("AUTH_PROVIDER_UNSUPPORTED".equals(code)) {
            return 400;
        }
        if (code != null && code.endsWith("_OAUTH_NOT_CONFIGURED")) {
            return 503;
        }
        return 401;
    }

    private static OauthProvider parseProvider(String raw) {
        try {
            return OauthProvider.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AuthException("AUTH_PROVIDER_UNSUPPORTED", "Unknown provider: " + raw);
        }
    }

    private String readRefreshFromCookie(HttpServletRequest request) {
        if (request == null || request.getCookies() == null) return null;
        String name = cookieFactory.refreshCookieName();
        for (Cookie c : request.getCookies()) {
            if (name.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }

    /**
     * (PR #112) {@code nonce} 는 client 가 OAuth authorize 시 생성·전송한 원본 값. 누락 시
     * 서버는 nonce 검증을 건너뜀 (구버전 클라 호환). 새 클라는 항상 전송 권장.
     */
    public record OauthExchangeRequest(@NotBlank String idToken, String nonce) {}

    /** 웹 v2 redirect flow 의 code 교환 요청. {@code nonce} 는 {@link OauthExchangeRequest} 와 동일 규약. */
    public record OauthCodeExchangeRequest(@NotBlank String code, @NotBlank String redirectUri, String nonce) {}

    /** refresh / logout 본문 — refreshToken 누락 시 백엔드가 쿠키에서 fallback 으로 읽음. */
    public record TokenPair(String refreshToken) {}

    public record TokenResponse(String accessToken, String refreshToken, long expiresIn) {
        static TokenResponse of(AuthTokens t) {
            return new TokenResponse(t.accessToken(), t.refreshToken(), t.accessTtlSeconds());
        }
    }
}
