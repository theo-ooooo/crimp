package io.crimp.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.crimp.core.entity.enums.UserRole;
import io.crimp.domain.auth.JwtProperties;
import io.crimp.domain.auth.JwtProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

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
