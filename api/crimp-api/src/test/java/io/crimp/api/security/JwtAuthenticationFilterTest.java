package io.crimp.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.crimp.core.entity.enums.UserRole;
import io.crimp.domain.auth.JwtProperties;
import io.crimp.domain.auth.JwtProvider;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * {@link JwtAuthenticationFilter} 의 role → Spring Security 권한 매핑 단위 테스트.
 *
 * <p>JwtProvider 는 실제 인스턴스를 사용 — 토큰 생성·파싱의 round-trip 까지 함께 보증.
 */
class JwtAuthenticationFilterTest {

    private static final String SECRET = "unit-test-secret-at-least-32-bytes-long-for-hs256-signing!";
    private static final String ISSUER = "https://crimp.test";

    private final JwtProvider provider = new JwtProvider(
            new JwtProperties(SECRET, 900L, 1_209_600L, ISSUER));
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(provider, new ObjectMapper());

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void mapsUserRoleClaim_toRoleUserAuthority() throws Exception {
        var token = provider.issueAccess(1L, "ext-1", UserRole.USER).token();

        var req = new MockHttpServletRequest();
        req.addHeader("Authorization", "Bearer " + token);
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_USER");
        verify(chain).doFilter(req, res);
    }

    @Test
    void mapsAdminRoleClaim_toRoleAdminAuthority() throws Exception {
        var token = provider.issueAccess(2L, "ext-2", UserRole.ADMIN).token();

        var req = new MockHttpServletRequest();
        req.addHeader("Authorization", "Bearer " + token);
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_ADMIN");
    }

    @Test
    void noAuthHeader_leavesContextEmpty_andCallsChain() throws Exception {
        var req = new MockHttpServletRequest();
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(req, res);
    }

    @Test
    void legacyToken_withoutRoleClaim_mapsToRoleUser() throws Exception {
        // [PR #88 리뷰 I3] role claim 이 없는 구버전 토큰이 들어오면 ROLE_USER 로 안전하게
        // fallback 되어야 한다. JwtProvider 단의 fallback 만으로는 filter→authority 라인의
        // end-to-end 회귀를 못 잡으므로 본 테스트가 그 라인을 직접 보증.
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

        var req = new MockHttpServletRequest();
        req.addHeader("Authorization", "Bearer " + legacy);
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_USER");
        verify(chain).doFilter(req, res);
    }

    @Test
    void invalidToken_returns401_andDoesNotCallChain() throws Exception {
        var req = new MockHttpServletRequest();
        req.addHeader("Authorization", "Bearer not-a-real-token");
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(res.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
