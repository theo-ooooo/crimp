package io.crimp.infra.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Kakao OAuth 관련 설정.
 *
 * <p>섹션 구분:
 * <ul>
 *   <li>OIDC ID Token 검증: {@code clientId}, {@code issuer}, {@code jwksUri}
 *       (모바일/JS SDK 가 직접 발급한 id_token 을 백엔드에서 검증)</li>
 *   <li>Authorization Code 교환: {@code restApiKey}, {@code clientSecret},
 *       {@code tokenUri} (웹 v2 redirect flow — 브라우저가 code 만 받고
 *       서버가 Kakao 의 /oauth/token 으로 직접 교환).</li>
 * </ul>
 *
 * <p>{@code clientSecret} 은 Kakao 콘솔에서 활성화한 경우에만 사용. 미설정 시
 * 빈 문자열로 두면 교환 요청에서 자동으로 생략된다.
 *
 * <p>{@code restApiKey} 가 비어 있으면 code 교환 엔드포인트는
 * {@code KAKAO_OAUTH_NOT_CONFIGURED} 로 503 응답을 돌려준다.
 */
@ConfigurationProperties(prefix = "app.auth.oauth.kakao")
public record KakaoProperties(
        String clientId,
        String issuer,
        String jwksUri,
        String restApiKey,
        String clientSecret,
        String tokenUri
) {
    /** restApiKey 가 의미 있는 값인지 — 교환 엔드포인트 활성화 여부. */
    public boolean isCodeExchangeEnabled() {
        return restApiKey != null && !restApiKey.isBlank();
    }

    /** clientSecret 사용 여부 — 콘솔에서 활성화한 경우에만 true. */
    public boolean hasClientSecret() {
        return clientSecret != null && !clientSecret.isBlank();
    }
}
