package io.crimp.infra.auth;

import io.crimp.core.entity.enums.OauthProvider;
import io.crimp.domain.auth.OauthIdTokenVerifier;
import io.crimp.domain.auth.OauthUserInfo;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Apple Sign In ID Token(OIDC) 검증 (PR #102, F-D1).
 *
 * <p>Apple 의 JWKS 는 {@code https://appleid.apple.com/auth/keys} 에서 제공되며,
 * NimbusJwtDecoder 가 자동 캐시한다. iss 는 {@code https://appleid.apple.com}, aud 는
 * iOS 번들 ID 또는 웹 Service ID. 본 verifier 는 multi-audience 화이트리스트를
 * 구성해 네이티브/웹 양쪽을 모두 허용.
 *
 * <p>Apple 은 email 클레임을 첫 인증에서만 제공하므로 {@code email} 은 null 일 수 있고,
 * 호출 측 ({@code AuthService}) 이 이를 허용하도록 설계되어 있다 (Kakao 도 동일).
 */
@Component
@Profile("!test")
public class AppleIdTokenVerifier implements OauthIdTokenVerifier {

    private final JwtDecoder decoder;

    public AppleIdTokenVerifier(AppleProperties props) {
        NimbusJwtDecoder d = NimbusJwtDecoder.withJwkSetUri(props.jwksUri()).build();
        d.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                List.of(
                        JwtValidators.createDefaultWithIssuer(props.issuer()),
                        audienceValidator(allowedAudiences(props))
                )
        ));
        this.decoder = d;
    }

    @Override
    public OauthProvider supports() {
        return OauthProvider.APPLE;
    }

    @Override
    public OauthUserInfo verify(String idToken) {
        Jwt jwt = decoder.decode(idToken);
        String providerUid = jwt.getSubject();
        // Apple 은 첫 인증에서만 email 제공 — 이후 인증에서는 claim 자체가 없음.
        // null 일 수 있다는 의미가 도메인 모델에 이미 반영되어 있어 그대로 통과.
        String email = jwt.getClaimAsString("email");
        // [PR #112] nonce 클레임 — Apple 은 client 가 보낸 nonce 를 SHA-256 해 박는다.
        // 비교는 AuthService 가 client 원본을 동일 해시 후 일치 검사.
        String nonce = jwt.getClaimAsString("nonce");
        return new OauthUserInfo(OauthProvider.APPLE, providerUid, email, nonce);
    }

    /**
     * 검증에 허용할 audience 집합. iOS 네이티브 앱의 번들 ID 와 웹 Service ID 등 platform/client
     * 별로 다른 aud 값을 모두 허용 (Kakao 와 동일 패턴).
     */
    static Set<String> allowedAudiences(AppleProperties props) {
        Set<String> set = new LinkedHashSet<>();
        addIfPresent(set, props.clientId());
        if (props.additionalAudiences() != null) {
            props.additionalAudiences().forEach(a -> addIfPresent(set, a));
        }
        return set;
    }

    private static void addIfPresent(Set<String> set, String value) {
        if (value != null && !value.isBlank()) {
            set.add(value);
        }
    }

    static OAuth2TokenValidator<Jwt> audienceValidator(Set<String> allowed) {
        return jwt -> {
            List<String> aud = jwt.getAudience();
            if (aud != null && aud.stream().anyMatch(allowed::contains)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error(
                            "invalid_audience",
                            "Audience does not match any configured Apple client id",
                            null));
        };
    }
}
