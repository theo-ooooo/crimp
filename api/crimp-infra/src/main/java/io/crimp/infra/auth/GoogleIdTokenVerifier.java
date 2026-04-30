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
        // [PR #103 리뷰 I1] Google 의 id_token 의 iss 는 spec 상 https://accounts.google.com
        // 또는 bare accounts.google.com 둘 다 가능. JwtValidators.createDefaultWithIssuer 는
        // 정확 일치만 허용하므로 multi-issuer validator + default(만료/iat 등) 분리해 둘 다 통과.
        d.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                List.of(
                        JwtValidators.createDefault(),
                        issuerValidator(allowedIssuers(props.issuer())),
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

    /**
     * [PR #103 리뷰 I1] Google 의 dual-form iss 허용. 설정 값이
     * {@code https://accounts.google.com} 이면 {@code accounts.google.com} 도 함께 허용 —
     * 그 반대도 동일. SDK/JWT 생성기 차이로 인한 가짜 invalid_iss 거부 회피.
     */
    static Set<String> allowedIssuers(String configured) {
        Set<String> set = new LinkedHashSet<>();
        if (configured == null || configured.isBlank()) {
            return set;
        }
        set.add(configured);
        if (configured.startsWith("https://")) {
            set.add(configured.substring("https://".length()));
        } else {
            set.add("https://" + configured);
        }
        return set;
    }

    static OAuth2TokenValidator<Jwt> issuerValidator(Set<String> allowed) {
        return jwt -> {
            // jwt.getIssuer() 는 URL 변환을 시도해 bare form ("accounts.google.com") 에서
            // IllegalArgumentException — 직접 string claim 으로 읽어 비교.
            String iss = jwt.getClaimAsString("iss");
            if (iss != null && allowed.contains(iss)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error(
                            "invalid_issuer",
                            "Issuer does not match any allowed Google issuer (with/without https scheme)",
                            null));
        };
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
