package io.crimp.domain.auth;

import io.crimp.core.entity.enums.UserRole;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtProviderTest {

    private static final String SECRET = "unit-test-secret-at-least-32-bytes-long-for-hs256-signing!";
    private static final String ISSUER = "https://crimp.test";

    private final JwtProperties props = new JwtProperties(SECRET, 900L, 1_209_600L, ISSUER);
    private final JwtProvider provider = new JwtProvider(props);

    @Test
    void access_token_roundTrip() {
        var issued = provider.issueAccess(42L, "01HAAAAAAA", UserRole.USER);
        assertThat(issued.token()).isNotBlank();
        assertThat(issued.jti()).isNotBlank();

        var parsed = provider.parseAccess(issued.token());
        assertThat(parsed.userId()).isEqualTo(42L);
        assertThat(parsed.userExtId()).isEqualTo("01HAAAAAAA");
        assertThat(parsed.role()).isEqualTo(UserRole.USER);
        assertThat(parsed.jti()).isEqualTo(issued.jti());
        assertThat(parsed.expiresAt()).isAfter(Instant.now());
    }

    @Test
    void access_token_carriesAdminRole() {
        var issued = provider.issueAccess(1L, "ext", UserRole.ADMIN);
        var parsed = provider.parseAccess(issued.token());
        assertThat(parsed.role()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    void refresh_token_roundTrip() {
        var issued = provider.issueRefresh(99L, "01HBBBBBBB", UserRole.CREW_LEADER);
        var parsed = provider.parseRefresh(issued.token());
        assertThat(parsed.userId()).isEqualTo(99L);
        assertThat(parsed.userExtId()).isEqualTo("01HBBBBBBB");
        assertThat(parsed.role()).isEqualTo(UserRole.CREW_LEADER);
    }

    @Test
    void parseAccess_rejects_refresh_token() {
        var refresh = provider.issueRefresh(1L, "ext", UserRole.USER);
        assertThatThrownBy(() -> provider.parseAccess(refresh.token()))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void parseRefresh_rejects_access_token() {
        var access = provider.issueAccess(1L, "ext", UserRole.USER);
        assertThatThrownBy(() -> provider.parseRefresh(access.token()))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void parse_rejects_wrong_secret() {
        String tamperedSecret = "completely-different-secret-32-bytes-minimum-length-!!!";
        JwtProvider tampered = new JwtProvider(new JwtProperties(tamperedSecret, 900L, 1_209_600L, ISSUER));
        var token = provider.issueAccess(1L, "ext", UserRole.USER);
        assertThatThrownBy(() -> tampered.parseAccess(token.token()))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void parse_rejects_wrong_issuer() {
        JwtProvider wrongIssuer = new JwtProvider(new JwtProperties(SECRET, 900L, 1_209_600L, "https://other.test"));
        var token = provider.issueAccess(1L, "ext", UserRole.USER);
        assertThatThrownBy(() -> wrongIssuer.parseAccess(token.token()))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void parse_rejects_expired_token() {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        String expired = Jwts.builder()
                .subject("1")
                .issuer(ISSUER)
                .id("jti-exp")
                .issuedAt(new Date(System.currentTimeMillis() - 10_000))
                .expiration(new Date(System.currentTimeMillis() - 1_000))
                .claims(Map.of("typ", "access", "ext", "ext-id", "role", "USER"))
                .signWith(key)
                .compact();
        assertThatThrownBy(() -> provider.parseAccess(expired))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void parse_fallsBackToUserRole_whenClaimMissing() {
        // role claim 이 없는 구버전 토큰 (이전 발급분) 호환성 — USER 로 강등 후 통과.
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        String legacy = Jwts.builder()
                .subject("7")
                .issuer(ISSUER)
                .id("jti-legacy")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .claims(Map.of("typ", "access", "ext", "legacy-ext"))
                .signWith(key)
                .compact();
        var parsed = provider.parseAccess(legacy);
        assertThat(parsed.role()).isEqualTo(UserRole.USER);
    }

    @Test
    void parse_strangelyNamedRole_isDowngradedToUser() {
        // 알 수 없는 role 이름이 들어오면 권한 상승을 막기 위해 USER 로 강등.
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        String weird = Jwts.builder()
                .subject("7")
                .issuer(ISSUER)
                .id("jti-weird")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .claims(Map.of("typ", "access", "ext", "ext", "role", "SUPER_ADMIN_TYPO"))
                .signWith(key)
                .compact();
        var parsed = provider.parseAccess(weird);
        assertThat(parsed.role()).isEqualTo(UserRole.USER);
    }

    @Test
    void constructor_rejects_short_secret() {
        assertThatThrownBy(() -> new JwtProvider(new JwtProperties("too-short", 900L, 1_209_600L, ISSUER)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32바이트");
    }
}
