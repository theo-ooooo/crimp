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
 * Google Sign In ID Token(OIDC) 검증 (PR #103, F-D2).
 *
 * <p>Google 의 JWKS 는 {@code https://www.googleapis.com/oauth2/v3/certs} 에서 제공되며
 * NimbusJwtDecoder 가 자동 캐시한다. iss 는 {@code https://accounts.google.com}, aud 는
 * SDK 초기화에 사용한 client_id (iOS / Android / Web 별로 다름).
 *
 * <p>RN `@react-native-google-signin/google-signin` 의 일반 패턴은 Android/iOS 가 모두
 * **webClientId** 로 ID Token 을 받기 때문에 single audience 로 충분한 경우가 많지만,
 * native client_id 직접 사용하는 케이스도 있어 multi-audience 화이트리스트 지원.
 */
@Component
@Profile("!test")
public class GoogleIdTokenVerifier implements OauthIdTokenVerifier {

    private final JwtDecoder decoder;

    public GoogleIdTokenVerifier(GoogleProperties props) {
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
        return OauthProvider.GOOGLE;
    }

    @Override
    public OauthUserInfo verify(String idToken) {
        Jwt jwt = decoder.decode(idToken);
        String providerUid = jwt.getSubject();
        // Google 은 email 을 항상 제공 — null 케이스는 거의 없으나 안전하게 nullable 그대로.
        String email = jwt.getClaimAsString("email");
        return new OauthUserInfo(OauthProvider.GOOGLE, providerUid, email);
    }

    /**
     * 검증에 허용할 audience 집합. iOS / Android / Web client_id 등 platform 별로 다른
     * aud 값을 모두 허용 (Kakao · Apple 과 동일 패턴).
     */
    static Set<String> allowedAudiences(GoogleProperties props) {
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
                            "Audience does not match any configured Google client id",
                            null));
        };
    }
}
