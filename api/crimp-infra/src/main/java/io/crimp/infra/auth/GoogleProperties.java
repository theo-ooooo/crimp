package io.crimp.infra.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Google Sign In OAuth 관련 설정 (PR #103, F-D2).
 *
 * <p>섹션 구분:
 * <ul>
 *   <li>OIDC ID Token 검증: {@code clientId}, {@code issuer}, {@code jwksUri}.
 *       Google 은 platform 별 client_id 가 다르므로 (iOS · Android · Web 각각), 본 앱이
 *       SDK 초기화에 사용한 모든 client_id 를 audience 화이트리스트에 포함시켜야 한다.
 *       특히 React Native `@react-native-google-signin/google-signin` 사용 시
 *       Android 는 Web client ID 로 id_token 을 받으므로 web client ID 를 함께 등록 권장.</li>
 *   <li>(추후 PR — 웹 v2 redirect flow) Authorization Code 교환은 별도. Google 은
 *       Apple 과 달리 client_secret 이 정적이라 Kakao 와 거의 동일한 패턴.</li>
 * </ul>
 *
 * <p>Google Sign In 특이점:
 * <ul>
 *   <li>email 클레임은 항상 제공 (Apple 의 first-auth-only 와 다름) + email_verified 함께.</li>
 *   <li>iss 는 {@code https://accounts.google.com} 또는 {@code accounts.google.com} 둘 다 가능
 *       (Google 의 spec). NimbusJwtDecoder 의 issuer validator 는 정확 일치를 요구하므로
 *       application.yml 에서 정확한 값을 박아두는 게 중요.</li>
 *   <li>aud 는 SDK 에 전달한 client_id — RN google-signin 의 case 는 Android/iOS 가 모두
 *       webClientId 로 받기 때문에 그 한 값만 audience 화이트리스트에 있으면 충분한 경우 多.</li>
 * </ul>
 */
@ConfigurationProperties(prefix = "app.auth.oauth.google")
public record GoogleProperties(
        String clientId,
        String issuer,
        String jwksUri,
        List<String> additionalAudiences
) {}
