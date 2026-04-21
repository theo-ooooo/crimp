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

import java.util.List;

/** Kakao ID Token(OIDC) 검증. JWKS 는 NimbusJwtDecoder 가 자동 캐시. */
@Component
@Profile("!test")
public class KakaoIdTokenVerifier implements OauthIdTokenVerifier {

    private final JwtDecoder decoder;
    private final KakaoProperties props;

    public KakaoIdTokenVerifier(KakaoProperties props) {
        this.props = props;
        NimbusJwtDecoder d = NimbusJwtDecoder.withJwkSetUri(props.jwksUri()).build();
        d.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
                List.of(
                        JwtValidators.createDefaultWithIssuer(props.issuer()),
                        audienceValidator(props.clientId())
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

    private static OAuth2TokenValidator<Jwt> audienceValidator(String expectedAudience) {
        return jwt -> jwt.getAudience() != null && jwt.getAudience().contains(expectedAudience)
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(
                new org.springframework.security.oauth2.core.OAuth2Error(
                        "invalid_audience", "Audience does not match Kakao client id", null));
    }
}
