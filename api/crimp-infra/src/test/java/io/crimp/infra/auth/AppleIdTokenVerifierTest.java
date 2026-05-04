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
 * {@link AppleIdTokenVerifier} 의 audience 합집합 / 검증 로직 단위 테스트.
 *
 * <p>{@link KakaoIdTokenVerifierTest} 와 동일한 격리 패턴 — NimbusJwtDecoder 자체는
 * 외부 JWKS 의존이라 통합 테스트 영역. 여기서는 audience 집합 구성과 validator 동작만
 * 격리해서 검증한다.
 */
class AppleIdTokenVerifierTest {

    private static AppleProperties props(String clientId, List<String> additional) {
        return props(clientId, "", additional);
    }

    private static AppleProperties props(String clientId, String serviceId, List<String> additional) {
        return new AppleProperties(
                clientId,
                "https://appleid.apple.com",
                "https://appleid.apple.com/auth/keys",
                additional,
                serviceId, "", "", "", ""
        );
    }

    private static Jwt jwtWithAudience(List<String> audience) {
        return Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .audience(audience)
                .subject("000123.abcdef.0001")
                .build();
    }

    @Test
    void allowedAudiences_includesClientIdAndExtras() {
        Set<String> allowed = AppleIdTokenVerifier.allowedAudiences(
                props("io.crimp.app", List.of("crimp.web", "crimp.admin")));

        assertThat(allowed).containsExactlyInAnyOrder(
                "io.crimp.app", "crimp.web", "crimp.admin");
    }

    @Test
    void allowedAudiences_includesServiceIdForWebCodeFlow() {
        Set<String> allowed = AppleIdTokenVerifier.allowedAudiences(
                props("io.crimp.app", "com.crimp.web", List.of()));

        assertThat(allowed).containsExactlyInAnyOrder("io.crimp.app", "com.crimp.web");
    }

    @Test
    void allowedAudiences_filtersBlankAndNullEntries() {
        Set<String> allowed = AppleIdTokenVerifier.allowedAudiences(
                props("io.crimp.app", List.of("", "  ", "crimp.web")));

        assertThat(allowed).containsExactlyInAnyOrder("io.crimp.app", "crimp.web");
    }

    @Test
    void allowedAudiences_handlesNullAdditionalList() {
        Set<String> allowed = AppleIdTokenVerifier.allowedAudiences(
                props("io.crimp.app", null));

        assertThat(allowed).containsExactlyInAnyOrder("io.crimp.app");
    }

    @Test
    void allowedAudiences_filtersBlankClientId() {
        // clientId 가 빈 문자열이고 additional 도 없으면 빈 집합. (운영에서는 application.yml
        // 에 placeholder 라도 채워두는 게 정상이지만, 검증 로직은 빈 집합도 안전 처리.)
        Set<String> allowed = AppleIdTokenVerifier.allowedAudiences(
                props("", List.of()));

        assertThat(allowed).isEmpty();
    }

    @Test
    void allowedAudiences_filtersNullClientId() {
        // [PR #102 리뷰 I2] null clientId 도 안전 처리 — addIfPresent 가 null 를 거름.
        Set<String> allowed = AppleIdTokenVerifier.allowedAudiences(
                props(null, List.of("crimp.web")));

        assertThat(allowed).containsExactly("crimp.web");
    }

    @Test
    void audienceValidator_succeedsWhenAnyAudienceMatches() {
        OAuth2TokenValidator<Jwt> v = AppleIdTokenVerifier.audienceValidator(
                Set.of("io.crimp.app", "crimp.web"));

        OAuth2TokenValidatorResult result = v.validate(jwtWithAudience(List.of("io.crimp.app")));

        assertThat(result.hasErrors()).isFalse();
    }

    @Test
    void audienceValidator_succeedsWhenJwtAudienceContainsExtra() {
        OAuth2TokenValidator<Jwt> v = AppleIdTokenVerifier.audienceValidator(
                Set.of("io.crimp.app", "crimp.web", "crimp.admin"));

        OAuth2TokenValidatorResult result = v.validate(jwtWithAudience(List.of("crimp.admin")));

        assertThat(result.hasErrors()).isFalse();
    }

    @Test
    void audienceValidator_failsWhenNoAudienceMatches() {
        OAuth2TokenValidator<Jwt> v = AppleIdTokenVerifier.audienceValidator(
                Set.of("io.crimp.app"));

        OAuth2TokenValidatorResult result = v.validate(jwtWithAudience(List.of("other.app")));

        assertThat(result.hasErrors()).isTrue();
        assertThat(result.getErrors()).anySatisfy(err ->
                assertThat(err.getErrorCode()).isEqualTo("invalid_audience"));
    }
}
