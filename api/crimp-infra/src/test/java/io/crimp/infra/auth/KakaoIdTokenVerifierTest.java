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
 * {@link KakaoIdTokenVerifier} 의 audience 합집합 / 검증 로직 단위 테스트.
 *
 * <p>NimbusJwtDecoder 자체는 외부 JWKS 의존이라 통합 테스트 영역. 여기서는
 * audience 집합 구성과 validator 동작만 격리해서 검증한다.
 */
class KakaoIdTokenVerifierTest {

    private static KakaoProperties props(
            String nativeClientId,
            String webClientId,
            String restApiKey,
            List<String> additional) {
        return new KakaoProperties(
                nativeClientId, webClientId, "https://kauth.kakao.com", "https://x/jwks.json",
                restApiKey, "", "https://kauth.kakao.com/oauth/token", additional);
    }

    private static Jwt jwtWithAudience(List<String> audience) {
        return Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .audience(audience)
                .subject("user-1")
                .build();
    }

    @Test
    void allowedAudiences_includesNativeWebRestKeysAndExtras() {
        Set<String> allowed = KakaoIdTokenVerifier.allowedAudiences(
                props("native", "js", "rest", List.of("admin")));

        assertThat(allowed).containsExactlyInAnyOrder("native", "rest", "js", "admin");
    }

    @Test
    void allowedAudiences_filtersBlankAndNullEntries() {
        Set<String> allowed = KakaoIdTokenVerifier.allowedAudiences(
                props("native", "", "", List.of("", "  ", "legacy")));

        assertThat(allowed).containsExactlyInAnyOrder("native", "legacy");
    }

    @Test
    void allowedAudiences_handlesNullAdditionalList() {
        Set<String> allowed = KakaoIdTokenVerifier.allowedAudiences(
                props("native", "js", "rest", null));

        assertThat(allowed).containsExactlyInAnyOrder("native", "js", "rest");
    }

    @Test
    void audienceValidator_succeedsWhenAnyAudienceMatches() {
        OAuth2TokenValidator<Jwt> v = KakaoIdTokenVerifier.audienceValidator(Set.of("native", "rest"));

        OAuth2TokenValidatorResult result = v.validate(jwtWithAudience(List.of("rest")));

        assertThat(result.hasErrors()).isFalse();
    }

    @Test
    void audienceValidator_succeedsWhenJwtAudienceContainsExtra() {
        OAuth2TokenValidator<Jwt> v = KakaoIdTokenVerifier.audienceValidator(Set.of("native", "rest", "js"));

        OAuth2TokenValidatorResult result = v.validate(jwtWithAudience(List.of("js")));

        assertThat(result.hasErrors()).isFalse();
    }

    @Test
    void audienceValidator_failsWhenNoAudienceMatches() {
        OAuth2TokenValidator<Jwt> v = KakaoIdTokenVerifier.audienceValidator(Set.of("native"));

        OAuth2TokenValidatorResult result = v.validate(jwtWithAudience(List.of("other")));

        assertThat(result.hasErrors()).isTrue();
        assertThat(result.getErrors()).anySatisfy(err ->
                assertThat(err.getErrorCode()).isEqualTo("invalid_audience"));
    }
}
