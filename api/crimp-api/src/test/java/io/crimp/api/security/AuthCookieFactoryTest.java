package io.crimp.api.security;

import io.crimp.domain.auth.AuthTokens;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link AuthCookieFactory} / {@link AuthCookieProperties} 단위 테스트 (PR #94 리뷰 S6).
 *
 * <p>응답 객체에 발행되는 {@code Set-Cookie} 헤더의 실제 속성 (HttpOnly/Secure/SameSite/
 * Path/Domain/Max-Age) 을 직접 검증해, props 조합별로 의도된 쿠키가 발행되는지 회귀 차단.
 */
class AuthCookieFactoryTest {

    private static AuthTokens tokens() {
        return new AuthTokens("access-jwt", "refresh-jwt", 900L, 1_209_600L);
    }

    @Test
    void localDev_secureFalse_lax_emitsTwoCookies_withCorrectAttributes() {
        AuthCookieProperties props = new AuthCookieProperties("", false, "Lax", "crimp_access", "crimp_refresh");
        AuthCookieFactory factory = new AuthCookieFactory(props);
        MockHttpServletResponse res = new MockHttpServletResponse();

        factory.setAuthCookies(res, tokens());

        List<String> cookies = res.getHeaders(HttpHeaders.SET_COOKIE);
        assertThat(cookies).hasSize(2);
        String access = cookies.stream().filter(c -> c.startsWith("crimp_access=")).findFirst().orElseThrow();
        String refresh = cookies.stream().filter(c -> c.startsWith("crimp_refresh=")).findFirst().orElseThrow();

        // access: HttpOnly + Lax + Path=/ + access TTL.
        assertThat(access).contains("crimp_access=access-jwt");
        assertThat(access).contains("HttpOnly");
        assertThat(access).contains("Path=/");
        assertThat(access).contains("SameSite=Lax");
        assertThat(access).contains("Max-Age=900");
        assertThat(access).doesNotContain("Secure"); // local dev — HTTPS 미강제

        // refresh: HttpOnly + Lax + Path=/api/v1/auth + refresh TTL (PR #94 S4 — JwtProperties 와 동기).
        assertThat(refresh).contains("crimp_refresh=refresh-jwt");
        assertThat(refresh).contains("HttpOnly");
        assertThat(refresh).contains("Path=/api/v1/auth");
        assertThat(refresh).contains("SameSite=Lax");
        assertThat(refresh).contains("Max-Age=1209600");
    }

    @Test
    void prod_secureTrue_lax_withDomain_includesAllAttributes() {
        AuthCookieProperties props = new AuthCookieProperties(".crimp.app", true, "Lax", "crimp_access", "crimp_refresh");
        AuthCookieFactory factory = new AuthCookieFactory(props);
        MockHttpServletResponse res = new MockHttpServletResponse();

        factory.setAuthCookies(res, tokens());

        List<String> cookies = res.getHeaders(HttpHeaders.SET_COOKIE);
        for (String c : cookies) {
            assertThat(c).contains("Secure");
            assertThat(c).contains("Domain=.crimp.app");
            assertThat(c).contains("SameSite=Lax");
            assertThat(c).contains("HttpOnly");
        }
    }

    @Test
    void clearAuthCookies_emitsMaxAgeZero_emptyValues() {
        AuthCookieProperties props = new AuthCookieProperties("", false, "Lax", "crimp_access", "crimp_refresh");
        AuthCookieFactory factory = new AuthCookieFactory(props);
        MockHttpServletResponse res = new MockHttpServletResponse();

        factory.clearAuthCookies(res);

        List<String> cookies = res.getHeaders(HttpHeaders.SET_COOKIE);
        assertThat(cookies).hasSize(2);
        for (String c : cookies) {
            assertThat(c).contains("Max-Age=0");
        }
    }

    // --- AuthCookieProperties 검증 (S1 + S2) ---

    @Test
    void props_sameSiteNone_withSecureFalse_throws() {
        // [PR #94 리뷰 S1] None + !Secure → 모든 브라우저가 쿠키 거부 → 조용한 인증 실패.
        // 빈 등록 단계에서 fail-fast.
        assertThatThrownBy(() -> new AuthCookieProperties("", false, "None", null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("None");
    }

    @Test
    void props_sameSiteNone_withSecureTrue_isAccepted() {
        // None 도 secure=true 와 함께면 정상.
        AuthCookieProperties props = new AuthCookieProperties("", true, "None", null, null);
        assertThat(props.sameSite()).isEqualTo("None");
        assertThat(props.secure()).isTrue();
    }

    @Test
    void props_invalidSameSite_throws() {
        // [PR #94 리뷰 S2] 오타 ('Lex') 통과 차단.
        assertThatThrownBy(() -> new AuthCookieProperties("", false, "Lex", null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Lax/Strict/None");
    }

    @Test
    void props_blankSameSite_defaultsToLax() {
        AuthCookieProperties props = new AuthCookieProperties("", false, "", null, null);
        assertThat(props.sameSite()).isEqualTo("Lax");
    }

    @Test
    void props_blankAccessAndRefreshNames_useDefaults() {
        AuthCookieProperties props = new AuthCookieProperties("", false, "Lax", "", "");
        assertThat(props.accessName()).isEqualTo("crimp_access");
        assertThat(props.refreshName()).isEqualTo("crimp_refresh");
    }
}
