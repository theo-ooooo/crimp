package io.crimp.infra.auth;

import io.crimp.infra.auth.KakaoOAuthClient.KakaoOAuthException;
import io.crimp.infra.auth.KakaoOAuthClient.KakaoTokenResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentCaptor.forClass;

/**
 * {@link KakaoOAuthClient} 단위 테스트.
 *
 * <p>RestTemplate 을 모킹해 form-encoded 요청 바디 / Content-Type / 응답 매핑을 검증한다.
 */
class KakaoOAuthClientTest {

    private static final String TOKEN_URI = "https://kauth.kakao.com/oauth/token";

    private KakaoProperties propsWithSecret() {
        return new KakaoProperties(
                "test-client-id", "https://kauth.kakao.com", "https://x/jwks.json",
                "test-rest-api-key", "test-client-secret", TOKEN_URI, List.of());
    }

    private KakaoProperties propsNoSecret() {
        return new KakaoProperties(
                "test-client-id", "https://kauth.kakao.com", "https://x/jwks.json",
                "test-rest-api-key", "", TOKEN_URI, List.of());
    }

    @Test
    void exchangeCode_postsFormEncodedRequestWithExpectedFields() {
        RestTemplate rt = mock(RestTemplate.class);
        KakaoTokenResponse stub = new KakaoTokenResponse(
                "Bearer", "kakao-access", 7200L, "kakao-refresh", 5_184_000L,
                "valid-id-token", "openid");
        when(rt.postForEntity(eq(TOKEN_URI), any(HttpEntity.class), eq(KakaoTokenResponse.class)))
                .thenReturn(ResponseEntity.ok(stub));

        KakaoOAuthClient client = new KakaoOAuthClient(rt, propsWithSecret());

        KakaoTokenResponse result = client.exchangeCode("auth-code-1", "https://app/cb");

        assertThat(result.idToken()).isEqualTo("valid-id-token");

        @SuppressWarnings("rawtypes")
        var captor = forClass(HttpEntity.class);
        verify(rt).postForEntity(eq(TOKEN_URI), captor.capture(), eq(KakaoTokenResponse.class));
        HttpEntity<?> sent = captor.getValue();

        // Content-Type
        HttpHeaders headers = sent.getHeaders();
        assertThat(headers.getContentType()).isEqualTo(MediaType.APPLICATION_FORM_URLENCODED);

        // Body — form-encoded fields
        @SuppressWarnings("unchecked")
        MultiValueMap<String, String> body = (MultiValueMap<String, String>) sent.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getFirst("grant_type")).isEqualTo("authorization_code");
        assertThat(body.getFirst("client_id")).isEqualTo("test-rest-api-key");
        assertThat(body.getFirst("redirect_uri")).isEqualTo("https://app/cb");
        assertThat(body.getFirst("code")).isEqualTo("auth-code-1");
        assertThat(body.getFirst("client_secret")).isEqualTo("test-client-secret");
    }

    @Test
    void exchangeCode_omitsClientSecretWhenNotConfigured() {
        RestTemplate rt = mock(RestTemplate.class);
        when(rt.postForEntity(eq(TOKEN_URI), any(HttpEntity.class), eq(KakaoTokenResponse.class)))
                .thenReturn(ResponseEntity.ok(new KakaoTokenResponse(
                        "Bearer", "a", 1L, "r", 1L, "id", "openid")));

        KakaoOAuthClient client = new KakaoOAuthClient(rt, propsNoSecret());
        client.exchangeCode("c", "https://app/cb");

        @SuppressWarnings("rawtypes")
        var captor = forClass(HttpEntity.class);
        verify(rt).postForEntity(eq(TOKEN_URI), captor.capture(), eq(KakaoTokenResponse.class));
        @SuppressWarnings("unchecked")
        MultiValueMap<String, String> body = (MultiValueMap<String, String>) captor.getValue().getBody();
        assertThat(body).isNotNull();
        assertThat(body.containsKey("client_secret")).isFalse();
    }

    @Test
    void exchangeCode_responseMissingIdToken_throws() {
        RestTemplate rt = mock(RestTemplate.class);
        when(rt.postForEntity(eq(TOKEN_URI), any(HttpEntity.class), eq(KakaoTokenResponse.class)))
                .thenReturn(ResponseEntity.ok(new KakaoTokenResponse(
                        "Bearer", "access-only", 1L, null, null, null, "openid")));

        KakaoOAuthClient client = new KakaoOAuthClient(rt, propsWithSecret());

        assertThatThrownBy(() -> client.exchangeCode("c", "https://app/cb"))
                .isInstanceOf(KakaoOAuthException.class)
                .hasMessageContaining("id_token");
    }

    @Test
    void exchangeCode_kakao4xx_isWrapped() {
        RestTemplate rt = mock(RestTemplate.class);
        HttpClientErrorException ex = HttpClientErrorException.create(
                HttpStatus.UNAUTHORIZED, "Unauthorized", new HttpHeaders(),
                "{\"error\":\"invalid_grant\",\"error_description\":\"code expired\"}".getBytes(),
                null);
        when(rt.postForEntity(eq(TOKEN_URI), any(HttpEntity.class), eq(KakaoTokenResponse.class)))
                .thenThrow(ex);

        KakaoOAuthClient client = new KakaoOAuthClient(rt, propsWithSecret());

        assertThatThrownBy(() -> client.exchangeCode("c", "https://app/cb"))
                .isInstanceOf(KakaoOAuthException.class)
                .hasMessageContaining("401")
                .hasMessageContaining("invalid_grant");
    }

    @Test
    void exchangeCode_networkError_isWrapped() {
        RestTemplate rt = mock(RestTemplate.class);
        when(rt.postForEntity(eq(TOKEN_URI), any(HttpEntity.class), eq(KakaoTokenResponse.class)))
                .thenThrow(new ResourceAccessException("connection refused"));

        KakaoOAuthClient client = new KakaoOAuthClient(rt, propsWithSecret());

        assertThatThrownBy(() -> client.exchangeCode("c", "https://app/cb"))
                .isInstanceOf(KakaoOAuthException.class)
                .hasMessageContaining("transport error");
    }

    @Test
    void exchangeCode_throwsWhenRestApiKeyMissing() {
        RestTemplate rt = mock(RestTemplate.class);
        KakaoProperties props = new KakaoProperties(
                "client", "iss", "jwks", "", "", TOKEN_URI, List.of());
        KakaoOAuthClient client = new KakaoOAuthClient(rt, props);

        assertThatThrownBy(() -> client.exchangeCode("c", "https://app/cb"))
                .isInstanceOf(KakaoOAuthException.class);
    }

    @Test
    void kakaoTokenResponse_recordHoldsAllFields() {
        // 컴파일러 경고 / 미사용 필드 회귀 방지용 — 모든 필드가 record component 인지 확인.
        KakaoTokenResponse r = new KakaoTokenResponse(
                "Bearer", "a", 1L, "r", 2L, "id", "openid");
        assertThat(List.of(r.tokenType(), r.accessToken(), r.refreshToken(), r.idToken(), r.scope()))
                .containsExactly("Bearer", "a", "r", "id", "openid");
        assertThat(r.expiresIn()).isEqualTo(1L);
        assertThat(r.refreshTokenExpiresIn()).isEqualTo(2L);
    }
}
