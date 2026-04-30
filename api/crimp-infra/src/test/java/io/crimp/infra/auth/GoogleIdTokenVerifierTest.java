package io.crimp.infra.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link GoogleIdTokenVerifier} 의 audience 합집합 / 검증 로직 단위 테스트.
 *
 * <p>{@link KakaoIdTokenVerifierTest} / {@link AppleIdTokenVerifierTest} 와 동일한
 * 격리 패턴 — NimbusJwtDecoder 자체는 외부 JWKS 의존이라 통합 테스트 영역. 여기서는
 * audience 집합 구성과 validator 동작만 격리해서 검증한다.
 */
class GoogleIdTokenVerifierTest {

    private static GoogleProperties props(String clientId, List<String> additional) {
        return new GoogleProperties(
                clientId,
                "https://accounts.google.com",
                "https://www.googleapis.com/oauth2/v3/certs",
                additional
        );
    }

    private static Jwt jwtWithAudience(List<String> audience) {
        return Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .audience(audience)
                .subject("117451234567890123456")
                .build();
    }

    @Test
    void allowedAudiences_includesClientIdAndExtras() {
        Set<String> allowed = GoogleIdTokenVerifier.allowedAudiences(
                props("web-1.apps.googleusercontent.com",
                        List.of("ios-1.apps.googleusercontent.com",
                                "android-1.apps.googleusercontent.com")));

        assertThat(allowed).containsExactlyInAnyOrder(
                "web-1.apps.googleusercontent.com",
                "ios-1.apps.googleusercontent.com",
                "android-1.apps.googleusercontent.com");
    }

    @Test
    void allowedAudiences_filtersBlankAndNullEntries() {
        Set<String> allowed = GoogleIdTokenVerifier.allowedAudiences(
                props("web-1.apps.googleusercontent.com",
                        List.of("", "  ", "ios-1.apps.googleusercontent.com")));

        assertThat(allowed).containsExactlyInAnyOrder(
                "web-1.apps.googleusercontent.com",
                "ios-1.apps.googleusercontent.com");
    }

    @Test
    void allowedAudiences_handlesNullAdditionalList() {
        Set<String> allowed = GoogleIdTokenVerifier.allowedAudiences(
                props("web-1.apps.googleusercontent.com", null));

        assertThat(allowed).containsExactly("web-1.apps.googleusercontent.com");
    }

    @Test
    void allowedAudiences_filtersBlankClientId() {
        Set<String> allowed = GoogleIdTokenVerifier.allowedAudiences(
                props("", List.of()));

        assertThat(allowed).isEmpty();
    }

    @Test
    void allowedAudiences_filtersNullClientId() {
        Set<String> allowed = GoogleIdTokenVerifier.allowedAudiences(
                props(null, List.of("ios-1.apps.googleusercontent.com")));

        assertThat(allowed).containsExactly("ios-1.apps.googleusercontent.com");
    }

    @Test
    void audienceValidator_succeedsWhenAnyAudienceMatches() {
        OAuth2TokenValidator<Jwt> v = GoogleIdTokenVerifier.audienceValidator(
                Set.of("web-1.apps.googleusercontent.com",
                        "ios-1.apps.googleusercontent.com"));

        OAuth2TokenValidatorResult result = v.validate(
                jwtWithAudience(List.of("ios-1.apps.googleusercontent.com")));

        assertThat(result.hasErrors()).isFalse();
    }

    @Test
    void audienceValidator_succeedsWhenJwtAudienceContainsExtra() {
        OAuth2TokenValidator<Jwt> v = GoogleIdTokenVerifier.audienceValidator(
                Set.of("web-1.apps.googleusercontent.com",
                        "ios-1.apps.googleusercontent.com",
                        "android-1.apps.googleusercontent.com"));

        OAuth2TokenValidatorResult result = v.validate(
                jwtWithAudience(List.of("android-1.apps.googleusercontent.com")));

        assertThat(result.hasErrors()).isFalse();
    }

    @Test
    void audienceValidator_failsWhenNoAudienceMatches() {
        OAuth2TokenValidator<Jwt> v = GoogleIdTokenVerifier.audienceValidator(
                Set.of("web-1.apps.googleusercontent.com"));

        OAuth2TokenValidatorResult result = v.validate(
                jwtWithAudience(List.of("other.apps.googleusercontent.com")));

        assertThat(result.hasErrors()).isTrue();
        assertThat(result.getErrors()).anySatisfy(err ->
                assertThat(err.getErrorCode()).isEqualTo("invalid_audience"));
    }
}
