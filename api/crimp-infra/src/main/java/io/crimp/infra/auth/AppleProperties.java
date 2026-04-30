package io.crimp.infra.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Apple Sign In OAuth 관련 설정 (PR #102, F-D1).
 *
 * <p>섹션 구분:
 * <ul>
 *   <li>OIDC ID Token 검증: {@code clientId}, {@code issuer}, {@code jwksUri}.
 *       클라이언트 (iOS 네이티브 앱) 가 Apple 로부터 받은 id_token 을 백엔드에서 검증.
 *       Apple 의 {@code aud} 클레임은 보통 앱 번들 ID 또는 Service ID. iOS 네이티브
 *       앱과 웹 (Service ID) 둘 다 사용한다면 양쪽을 audience 집합에 포함시켜야 한다.</li>
 *   <li>(추후 PR — 웹 v2 redirect flow) Authorization Code 교환: Apple 은 client_secret
 *       을 ES256-서명한 JWT 로 직접 생성해야 하며, 본 PR 의 범위 외.</li>
 * </ul>
 *
 * <p>Apple Sign In 특이점:
 * <ul>
 *   <li>email 클레임은 첫 인증 시에만 제공 — 이후 인증에서는 누락. 호출 측이 null 처리.</li>
 *   <li>email_verified 도 함께 제공되지만 Apple 의 hide-email 모드에선 relay address 라
 *       동일성만 보장.</li>
 *   <li>Apple 은 aud 가 platform/client 별로 달라 multi-audience 화이트리스트 구성 필요.</li>
 * </ul>
 */
@ConfigurationProperties(prefix = "app.auth.oauth.apple")
public record AppleProperties(
        String clientId,
        String issuer,
        String jwksUri,
        List<String> additionalAudiences,
        // PR #106 (PR-W2) — 웹 v2 redirect flow 의 authorization_code 교환용.
        // serviceId/teamId/keyId/privateKeyPem 모두 채워졌을 때만 활성.
        // privateKeyPem 은 Apple Developer Portal 에서 발급한 .p8 파일 내용 그대로
        // (BEGIN PRIVATE KEY / END PRIVATE KEY 포함). 환경 변수 주입 권장.
        String serviceId,
        String teamId,
        String keyId,
        String privateKeyPem,
        String tokenUri
) {

    /** 웹 code 교환 활성화 — 4개 필수 항목이 모두 채워졌는지. */
    public boolean isCodeExchangeEnabled() {
        return notBlank(serviceId)
                && notBlank(teamId)
                && notBlank(keyId)
                && notBlank(privateKeyPem);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
