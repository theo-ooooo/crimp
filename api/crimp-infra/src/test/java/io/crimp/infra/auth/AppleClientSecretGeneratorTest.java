package io.crimp.infra.auth;

import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link AppleClientSecretGenerator} 단위 테스트 (PR #106, PR-W2).
 *
 * <p>실 Apple 키를 사용하지 않고 테스트용 P-256 EC keypair 를 발급해 그 private key 를
 * PEM 으로 export 한 뒤 generator 에 주입. 결과 JWT 의 헤더/페이로드/서명을 검증한다.
 */
class AppleClientSecretGeneratorTest {

    @Test
    void generate_buildsEs256JwtWithExpectedClaims() throws Exception {
        KeyPair pair = generateP256KeyPair();
        String pem = encodeToPkcs8Pem(pair.getPrivate());

        AppleClientSecretGenerator gen = new AppleClientSecretGenerator(
                "TEAM123", "io.crimp.web", "KEY456", pem);

        String jwt = gen.generate();

        // Header / payload / signature 형식 검증 — 단순 split count.
        assertThat(jwt.split("\\.")).hasSize(3);

        // 같은 keypair 의 public key 로 검증 — 서명 통과 + claims 일치.
        var parsed = Jwts.parser()
                .verifyWith((PublicKey) pair.getPublic())
                .build()
                .parseSignedClaims(jwt);

        assertThat(parsed.getHeader().getKeyId()).isEqualTo("KEY456");
        assertThat(parsed.getHeader().get("typ")).isEqualTo("JWT");
        assertThat(parsed.getHeader().getAlgorithm()).isEqualTo("ES256");

        var claims = parsed.getPayload();
        assertThat(claims.getIssuer()).isEqualTo("TEAM123");
        assertThat(claims.getSubject()).isEqualTo("io.crimp.web");
        assertThat(claims.getAudience()).contains("https://appleid.apple.com");
        assertThat(claims.getIssuedAt()).isNotNull();
        assertThat(claims.getExpiration()).isAfter(claims.getIssuedAt());
    }

    @Test
    void parsePkcs8Pem_rejectsBlank() {
        assertThatThrownBy(() -> AppleClientSecretGenerator.parsePkcs8Pem(""))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
        assertThatThrownBy(() -> AppleClientSecretGenerator.parsePkcs8Pem(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void parsePkcs8Pem_rejectsInvalidBase64() {
        assertThatThrownBy(() -> AppleClientSecretGenerator.parsePkcs8Pem(
                "-----BEGIN PRIVATE KEY-----\nNOT_BASE64@@@\n-----END PRIVATE KEY-----"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("base64");
    }

    @Test
    void parsePkcs8Pem_acceptsValidPemWithNewlines() throws Exception {
        KeyPair pair = generateP256KeyPair();
        String pem = encodeToPkcs8Pem(pair.getPrivate());

        PrivateKey key = AppleClientSecretGenerator.parsePkcs8Pem(pem);

        assertThat(key.getAlgorithm()).isEqualTo("EC");
    }

    // [PR #106 리뷰 I6] 식별자 null/blank 가드 검증.

    @Test
    void constructor_rejectsBlankTeamId() throws Exception {
        String pem = encodeToPkcs8Pem(generateP256KeyPair().getPrivate());
        assertThatThrownBy(() -> new AppleClientSecretGenerator("", "svc", "key", pem))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("teamId");
        assertThatThrownBy(() -> new AppleClientSecretGenerator(null, "svc", "key", pem))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("teamId");
    }

    @Test
    void constructor_rejectsBlankServiceId() throws Exception {
        String pem = encodeToPkcs8Pem(generateP256KeyPair().getPrivate());
        assertThatThrownBy(() -> new AppleClientSecretGenerator("team", "", "key", pem))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("serviceId");
    }

    @Test
    void constructor_rejectsBlankKeyId() throws Exception {
        String pem = encodeToPkcs8Pem(generateP256KeyPair().getPrivate());
        assertThatThrownBy(() -> new AppleClientSecretGenerator("team", "svc", "  ", pem))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("keyId");
    }

    private static KeyPair generateP256KeyPair() throws Exception {
        KeyPairGenerator g = KeyPairGenerator.getInstance("EC");
        g.initialize(new ECGenParameterSpec("secp256r1"));
        return g.generateKeyPair();
    }

    private static String encodeToPkcs8Pem(PrivateKey key) {
        String b64 = Base64.getEncoder().encodeToString(key.getEncoded());
        StringBuilder sb = new StringBuilder("-----BEGIN PRIVATE KEY-----\n");
        for (int i = 0; i < b64.length(); i += 64) {
            sb.append(b64, i, Math.min(i + 64, b64.length())).append('\n');
        }
        sb.append("-----END PRIVATE KEY-----\n");
        return sb.toString();
    }
}
