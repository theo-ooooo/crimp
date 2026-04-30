package io.crimp.infra.auth;

import io.jsonwebtoken.Jwts;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

/**
 * Apple OAuth 의 client_secret JWT 를 생성한다 (PR #106, PR-W2).
 *
 * <p>Apple 의 /auth/token 엔드포인트는 일반 OAuth 와 달리 client_secret 으로 정적 문자열이
 * 아닌 ES256-서명 JWT 를 요구한다 (Apple 공식 가이드).
 * <ul>
 *   <li><b>Header</b>: {@code { "alg": "ES256", "kid": <KEY_ID>, "typ": "JWT" }}</li>
 *   <li><b>Payload</b>:
 *       <ul>
 *         <li>{@code iss} — Apple Developer Team ID</li>
 *         <li>{@code iat} — 현재 시각 (epoch sec)</li>
 *         <li>{@code exp} — 최대 6개월. 본 구현은 보수적으로 1시간 — 매 호출 새로 생성.</li>
 *         <li>{@code aud} — {@code https://appleid.apple.com}</li>
 *         <li>{@code sub} — Apple Service ID (= client_id of /auth/token request)</li>
 *       </ul>
 *   </li>
 *   <li><b>Signature</b>: Apple 에서 발급받은 .p8 private key (P-256 EC) 로 ES256 서명</li>
 * </ul>
 *
 * <p>{@code privateKeyPem} 은 .p8 파일의 내용 (PKCS#8 PEM, {@code -----BEGIN PRIVATE KEY-----}
 * 와 {@code -----END PRIVATE KEY-----} 포함) 그대로. 본 클래스가 PEM 헤더/개행 제거 후
 * Base64 디코딩해 {@link PKCS8EncodedKeySpec} 로 로드한다.
 */
public class AppleClientSecretGenerator {

    private static final String AUDIENCE = "https://appleid.apple.com";
    /** 토큰 TTL — Apple 은 6개월까지 허용하지만 매 호출마다 짧게 만들어 폐기 비용 ↓. */
    private static final Duration TTL = Duration.ofHours(1);

    private final String teamId;
    private final String serviceId;
    private final String keyId;
    private final PrivateKey privateKey;

    public AppleClientSecretGenerator(String teamId, String serviceId, String keyId, String privateKeyPem) {
        this.teamId = teamId;
        this.serviceId = serviceId;
        this.keyId = keyId;
        this.privateKey = parsePkcs8Pem(privateKeyPem);
    }

    /** 호출 시점에 새 JWT 생성. {@link Instant#now()} 가 iat/exp 에 직접 박힘. */
    public String generate() {
        Instant now = Instant.now();
        return Jwts.builder()
                .header()
                .keyId(keyId)
                .type("JWT")
                .and()
                .issuer(teamId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(TTL)))
                .audience().add(AUDIENCE).and()
                .subject(serviceId)
                .signWith(privateKey, Jwts.SIG.ES256)
                .compact();
    }

    /**
     * .p8 PEM 형식을 PrivateKey 로 파싱. PKCS#8 wrapper 라 EC 알고리즘 spec 만 잡으면 된다.
     */
    static PrivateKey parsePkcs8Pem(String pem) {
        if (pem == null || pem.isBlank()) {
            throw new IllegalArgumentException("Apple privateKeyPem is empty");
        }
        String stripped = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");
        byte[] der;
        try {
            der = Base64.getDecoder().decode(stripped);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Apple privateKeyPem is not valid base64", e);
        }
        try {
            return KeyFactory.getInstance("EC").generatePrivate(new PKCS8EncodedKeySpec(der));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load Apple EC private key (P-256 expected)", e);
        }
    }
}
