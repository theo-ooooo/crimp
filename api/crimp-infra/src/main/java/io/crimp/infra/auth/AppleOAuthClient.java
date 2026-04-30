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
 * Apple OAuth /auth/token 엔드포인트 클라이언트 (PR #106, PR-W2).
 *
 * <p>Kakao 와 거의 동일한 form-encoded POST 패턴이지만 차이점은:
 * <ul>
 *   <li>{@code client_secret} 이 정적 문자열이 아닌 ES256-서명 JWT
 *       ({@link AppleClientSecretGenerator}).</li>
 *   <li>{@code client_id} 는 Apple Service ID (웹) 또는 App ID (네이티브). 본 PR 은 웹 흐름.</li>
 *   <li>{@code grant_type=authorization_code}</li>
 * </ul>
 *
 * <p>{@code @Profile("!test")} 가 붙어 단위 테스트는 직접 인스턴스화 + RestTemplate 모킹.
 */
@Component
@Profile("!test")
public class AppleOAuthClient {

    private static final String GRANT_TYPE = "authorization_code";
    private static final String DEFAULT_TOKEN_URI = "https://appleid.apple.com/auth/token";

    private final RestTemplate restTemplate;
    private final AppleProperties props;
    private final AppleClientSecretGenerator clientSecretGenerator;

    @Autowired
    public AppleOAuthClient(AppleProperties props) {
        this(new RestTemplate(), props,
                props.isCodeExchangeEnabled()
                        ? new AppleClientSecretGenerator(
                                props.teamId(), props.serviceId(), props.keyId(), props.privateKeyPem())
                        : null);
    }

    /** 단위 테스트 hook — RestTemplate / generator 둘 다 주입. */
    public AppleOAuthClient(RestTemplate restTemplate,
                            AppleProperties props,
                            AppleClientSecretGenerator clientSecretGenerator) {
        this.restTemplate = restTemplate;
        this.props = props;
        this.clientSecretGenerator = clientSecretGenerator;
    }

    /**
     * authorization_code → id_token 교환.
     *
     * @throws AppleOAuthException 4xx / 네트워크 / 응답 본문 누락
     */
    public AppleTokenResponse exchangeCode(String code, String redirectUri) {
        if (!props.isCodeExchangeEnabled() || clientSecretGenerator == null) {
            throw new AppleOAuthException("apple OAuth code exchange not configured (serviceId/teamId/keyId/privateKey)");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", GRANT_TYPE);
        form.add("client_id", props.serviceId());
        form.add("client_secret", clientSecretGenerator.generate());
        form.add("redirect_uri", redirectUri);
        form.add("code", code);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);
        try {
            ResponseEntity<AppleTokenResponse> response = restTemplate.postForEntity(
                    tokenUriOrDefault(),
                    request,
                    AppleTokenResponse.class);
            AppleTokenResponse body = response.getBody();
            if (body == null || body.idToken() == null || body.idToken().isBlank()) {
                throw new AppleOAuthException("Apple token response missing id_token");
            }
            return body;
        } catch (HttpStatusCodeException e) {
            throw new AppleOAuthException(
                    "Apple /auth/token failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(),
                    e);
        } catch (RestClientException e) {
            throw new AppleOAuthException("Apple /auth/token transport error: " + e.getMessage(), e);
        }
    }

    private String tokenUriOrDefault() {
        return (props.tokenUri() == null || props.tokenUri().isBlank())
                ? DEFAULT_TOKEN_URI
                : props.tokenUri();
    }

    /** Apple /auth/token 응답 (필요 필드만). */
    public record AppleTokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("token_type") String tokenType,
            @JsonProperty("expires_in") Long expiresIn,
            @JsonProperty("refresh_token") String refreshToken,
            @JsonProperty("id_token") String idToken
    ) {}

    /** Apple 호출 실패 — AuthService 가 잡아 AUTH_INVALID 로 변환. */
    public static class AppleOAuthException extends RuntimeException {
        public AppleOAuthException(String message) {
            super(message);
        }
        public AppleOAuthException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
