package io.crimp.api.auth;

import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.core.entity.enums.OauthProvider;
import io.crimp.domain.auth.AuthException;
import io.crimp.domain.auth.AuthService;
import io.crimp.domain.auth.AuthTokens;
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

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/oauth/{provider}")
    public TokenResponse exchange(
            @PathVariable String provider,
            @RequestBody OauthExchangeRequest req) {
        OauthProvider p = parseProvider(provider);
        AuthTokens tokens = authService.exchange(p, req.idToken());
        return TokenResponse.of(tokens);
    }

    /**
     * 웹 v2 redirect flow 전용 — authorization_code 를 백엔드에서 provider 토큰
     * 엔드포인트로 교환 후 id_token 검증·JWT 발급.
     *
     * <p>요청 본문:
     * <pre>{ "code": "...", "redirectUri": "https://app.crimp/login/callback" }</pre>
     *
     * <p>provider 키가 미설정이면 {@code KAKAO_OAUTH_NOT_CONFIGURED} 503.
     */
    @PostMapping("/oauth/{provider}/code")
    public TokenResponse exchangeCode(
            @PathVariable String provider,
            @RequestBody OauthCodeExchangeRequest req) {
        OauthProvider p = parseProvider(provider);
        AuthTokens tokens = authService.exchangeCode(p, req.code(), req.redirectUri());
        return TokenResponse.of(tokens);
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@RequestBody TokenPair req) {
        AuthTokens tokens = authService.refresh(req.refreshToken());
        return TokenResponse.of(tokens);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody TokenPair req) {
        authService.logout(req.refreshToken());
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

    public record OauthExchangeRequest(@NotBlank String idToken) {}

    /** 웹 v2 redirect flow 의 code 교환 요청. */
    public record OauthCodeExchangeRequest(@NotBlank String code, @NotBlank String redirectUri) {}

    public record TokenPair(@NotBlank String refreshToken) {}

    public record TokenResponse(String accessToken, String refreshToken, long expiresIn) {
        static TokenResponse of(AuthTokens t) {
            return new TokenResponse(t.accessToken(), t.refreshToken(), t.accessTtlSeconds());
        }
    }
}
