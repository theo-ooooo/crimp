package io.crimp.api.auth;

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

import java.util.Map;

@RestController
@RequestMapping("/v1/auth")
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
    public ResponseEntity<Map<String, Object>> handleAuth(AuthException e) {
        int status = switch (e.code()) {
            case "AUTH_PROVIDER_UNSUPPORTED" -> 400;
            case "AUTH_INVALID", "AUTH_USER_MISSING" -> 401;
            default -> 401;
        };
        return ResponseEntity.status(status).body(Map.of(
                "error", Map.of("code", e.code(), "message", e.getMessage())
        ));
    }

    private static OauthProvider parseProvider(String raw) {
        try {
            return OauthProvider.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AuthException("AUTH_PROVIDER_UNSUPPORTED", "Unknown provider: " + raw);
        }
    }

    public record OauthExchangeRequest(@NotBlank String idToken) {}

    public record TokenPair(@NotBlank String refreshToken) {}

    public record TokenResponse(String accessToken, String refreshToken, long expiresIn) {
        static TokenResponse of(AuthTokens t) {
            return new TokenResponse(t.accessToken(), t.refreshToken(), t.accessTtlSeconds());
        }
    }
}
