package io.crimp.infra.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Kakao OAuth /oauth/token 엔드포인트와 직접 통신하는 클라이언트.
 *
 * <p>웹 v2 redirect 흐름에서 브라우저가 받은 {@code authorization_code} 를
 * 서버가 RestTemplate 으로 form-encoded POST 하여 {@code id_token} (+ access/refresh)
 * 을 받는다. 받아온 id_token 은 기존 {@link KakaoIdTokenVerifier} 로 검증한다.
 *
 * <p>Kakao 응답 스펙:
 * <ul>
 *   <li>2xx — {@link KakaoTokenResponse}</li>
 *   <li>4xx — {@code { error, error_description, error_code }} → {@link KakaoOAuthException}</li>
 * </ul>
 *
 * <p>{@code @Profile("!test")} 가 붙어 단위 테스트는 스프링 컨텍스트 없이 직접
 * 인스턴스화하여 RestTemplate 을 모킹한다.
 */
@Component
@Profile("!test")
public class KakaoOAuthClient {

    private static final String GRANT_TYPE = "authorization_code";

    private final RestTemplate restTemplate;
    private final KakaoProperties props;

    /**
     * 운영 생성자 — Spring 이 RestTemplate 을 직접 만들어 주입한다.
     * `@Autowired` 를 명시해야 두 생성자 중 어느 걸 쓸지 Spring 이 결정 가능.
     */
    @Autowired
    public KakaoOAuthClient(KakaoProperties props) {
        this(new RestTemplate(), props);
    }

    /** 단위 테스트에서 RestTemplate 을 주입할 수 있도록 공개. */
    public KakaoOAuthClient(RestTemplate restTemplate, KakaoProperties props) {
        this.restTemplate = restTemplate;
        this.props = props;
    }

    /**
     * authorization_code 교환.
     *
     * @param code        브라우저가 redirect_uri 로 받은 1회용 code
     * @param redirectUri Kakao 인가 단계에서 사용한 redirect_uri (그대로 전달해야 함)
     * @return Kakao 토큰 응답 (id_token 포함)
     * @throws KakaoOAuthException 4xx / 네트워크 오류
     */
    public KakaoTokenResponse exchangeCode(String code, String redirectUri) {
        if (!props.isCodeExchangeEnabled()) {
            // 호출부에서 사전 차단하지만 방어적으로 한 번 더.
            throw new KakaoOAuthException("kakao.rest-api-key 미설정");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", GRANT_TYPE);
        form.add("client_id", props.restApiKey());
        form.add("redirect_uri", redirectUri);
        form.add("code", code);
        if (props.hasClientSecret()) {
            form.add("client_secret", props.clientSecret());
        }

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);
        try {
            ResponseEntity<KakaoTokenResponse> response = restTemplate.postForEntity(
                    props.tokenUri(),
                    request,
                    KakaoTokenResponse.class);
            KakaoTokenResponse body = response.getBody();
            if (body == null || body.idToken() == null || body.idToken().isBlank()) {
                throw new KakaoOAuthException("Kakao token response missing id_token");
            }
            return body;
        } catch (HttpStatusCodeException e) {
            // Kakao 4xx — error / error_description 본문은 향후 디버깅용으로 메시지에 포함.
            throw new KakaoOAuthException(
                    "Kakao /oauth/token failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(),
                    e);
        } catch (RestClientException e) {
            throw new KakaoOAuthException("Kakao /oauth/token transport error: " + e.getMessage(), e);
        }
    }

    /** Kakao /oauth/token 응답 (필요 필드만 매핑). */
    public record KakaoTokenResponse(
            @JsonProperty("token_type") String tokenType,
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in") Long expiresIn,
            @JsonProperty("refresh_token") String refreshToken,
            @JsonProperty("refresh_token_expires_in") Long refreshTokenExpiresIn,
            @JsonProperty("id_token") String idToken,
            @JsonProperty("scope") String scope
    ) {}

    /** Kakao 호출 실패 — {@code AuthService} 에서 잡아 {@code AUTH_INVALID} 로 변환. */
    public static class KakaoOAuthException extends RuntimeException {
        public KakaoOAuthException(String message) {
            super(message);
        }
        public KakaoOAuthException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
