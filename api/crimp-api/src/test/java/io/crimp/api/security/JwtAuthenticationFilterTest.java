package io.crimp.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.crimp.core.entity.enums.UserRole;
import io.crimp.domain.auth.JwtProperties;
import io.crimp.domain.auth.JwtProvider;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
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
import static org.mockito.Mockito.when;

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

    /** 테스트 헬퍼 — 쿠키 fallback 을 사용하지 않는 경우 (기본). */
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
            provider, new ObjectMapper(), emptyCookieFactory());

    /** AuthCookieFactory 빈이 없는 환경 (단위 테스트) — ObjectProvider 가 null 반환. */
    private static ObjectProvider<AuthCookieFactory> emptyCookieFactory() {
        @SuppressWarnings("unchecked")
        ObjectProvider<AuthCookieFactory> p = mock(ObjectProvider.class);
        return p;
    }

    /** 쿠키 fallback 을 위한 헬퍼 — 명시적 access cookie 이름을 가진 factory 주입. */
    private JwtAuthenticationFilter filterWithCookieSupport(String accessCookieName) {
        AuthCookieFactory factory = mock(AuthCookieFactory.class);
        when(factory.accessCookieName()).thenReturn(accessCookieName);
        @SuppressWarnings("unchecked")
        ObjectProvider<AuthCookieFactory> p = mock(ObjectProvider.class);
        when(p.getIfAvailable()).thenReturn(factory);
        return new JwtAuthenticationFilter(provider, new ObjectMapper(), p);
    }

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
    void cookieFallback_readsAccessTokenFromCrimpAccessCookie() throws Exception {
        // [PR #94, HttpOnly 전환] Authorization 헤더 없이 access 쿠키만 있어도 인증 통과.
        var token = provider.issueAccess(11L, "ext-cookie", UserRole.USER).token();

        var req = new MockHttpServletRequest();
        req.setCookies(new Cookie("crimp_access", token));
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filterWithCookieSupport("crimp_access").doFilter(req, res, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_USER");
        verify(chain).doFilter(req, res);
    }

    @Test
    void cookieAndBearer_bothPresent_BearerWins() throws Exception {
        // 둘 다 있으면 Bearer 가 우선 (모바일 호환).
        var bearerToken = provider.issueAccess(1L, "ext-bearer", UserRole.ADMIN).token();
        var cookieToken = provider.issueAccess(2L, "ext-cookie", UserRole.USER).token();

        var req = new MockHttpServletRequest();
        req.addHeader("Authorization", "Bearer " + bearerToken);
        req.setCookies(new Cookie("crimp_access", cookieToken));
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filterWithCookieSupport("crimp_access").doFilter(req, res, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_ADMIN"); // Bearer 의 ADMIN 이 이김
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
