package io.crimp.infra.auth;

import io.crimp.core.entity.enums.OauthProvider;
import io.crimp.domain.auth.OauthIdTokenVerifier;
import io.crimp.domain.auth.OauthUserInfo;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Kakao ID Token(OIDC) 검증. JWKS 는 NimbusJwtDecoder 가 자동 캐시. */
@Component
@Profile("!test")
public class KakaoIdTokenVerifier implements OauthIdTokenVerifier {

    private final JwtDecoder decoder;

    public KakaoIdTokenVerifier(KakaoProperties props) {
        NimbusJwtDecoder d = NimbusJwtDecoder.withJwkSetUri(props.jwksUri()).build();
        d.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
                List.of(
                        JwtValidators.createDefaultWithIssuer(props.issuer()),
                        audienceValidator(allowedAudiences(props))
                )
        ));
        this.decoder = d;
    }

    @Override
    public OauthProvider supports() {
        return OauthProvider.KAKAO;
    }

    @Override
    public OauthUserInfo verify(String idToken) {
        Jwt jwt = decoder.decode(idToken);
        String providerUid = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        return new OauthUserInfo(OauthProvider.KAKAO, providerUid, email);
    }

    /**
     * 검증에 허용할 audience 집합. 같은 Kakao 앱의 키 종류(네이티브/JS/REST)별로
     * id_token 의 {@code aud} 가 달라지므로 {@code clientId} 외에 {@code restApiKey}
     * 와 명시적 {@code additionalAudiences} 까지 합집합으로 허용한다.
     */
    static Set<String> allowedAudiences(KakaoProperties props) {
        Set<String> set = new LinkedHashSet<>();
        addIfPresent(set, props.clientId());
        addIfPresent(set, props.restApiKey());
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
                    new org.springframework.security.oauth2.core.OAuth2Error(
                            "invalid_audience",
                            "Audience does not match any configured Kakao client id",
                            null));
        };
    }
}
