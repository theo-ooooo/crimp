package io.crimp.api.auth;

import io.crimp.api.auth.AuthController.OauthCodeExchangeRequest;
import io.crimp.api.auth.AuthController.OauthExchangeRequest;
import io.crimp.api.auth.AuthController.TokenPair;
import io.crimp.api.auth.AuthController.TokenResponse;
import io.crimp.api.security.AuthCookieFactory;
import io.crimp.common.response.ApiResponse;
import io.crimp.core.entity.enums.OauthProvider;
import io.crimp.domain.auth.AuthException;
import io.crimp.domain.auth.AuthService;
import io.crimp.domain.auth.AuthTokens;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@link AuthController} 의 메서드 단위 테스트.
 *
 * <p>컨트롤러는 {@code @Profile("!test")} 가 붙어 통합 테스트(MockMvc + ApplicationContext)
 * 환경에서는 빈 등록이 안 되므로, 본 테스트는 컨트롤러 인스턴스를 직접 생성해
 * 메서드를 호출하고 envelope/HTTP status 매핑을 검증한다.
 */
class AuthControllerTest {

    private AuthService authService;
    private AuthController controller;

    private AuthCookieFactory cookieFactory;
    private HttpServletRequest request;
    private HttpServletResponse response;

    @BeforeEach
    void setUp() {
        authService = mock(AuthService.class);
        cookieFactory = mock(AuthCookieFactory.class);
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        controller = new AuthController(authService, cookieFactory);
    }

    @Test
    void exchange_returnsTokenResponse_andSetsCookies() {
        when(authService.exchange(eq(OauthProvider.KAKAO), eq("id-token-1")))
                .thenReturn(new AuthTokens("access", "refresh", 900L));

        TokenResponse res = controller.exchange("kakao", new OauthExchangeRequest("id-token-1"), response);

        assertThat(res.accessToken()).isEqualTo("access");
        assertThat(res.refreshToken()).isEqualTo("refresh");
        assertThat(res.expiresIn()).isEqualTo(900L);
        // [PR #94] Set-Cookie 가 발행되어야 함.
        verify(cookieFactory).setAuthCookies(eq(response), any(AuthTokens.class));
    }

    @Test
    void exchangeCode_returnsTokenResponse_andSetsCookies() {
        when(authService.exchangeCode(
                eq(OauthProvider.KAKAO), eq("auth-code-1"), eq("https://app/cb")))
                .thenReturn(new AuthTokens("access", "refresh", 900L));

        TokenResponse res = controller.exchangeCode("kakao",
                new OauthCodeExchangeRequest("auth-code-1", "https://app/cb"), response);

        assertThat(res.accessToken()).isEqualTo("access");
        verify(authService).exchangeCode(OauthProvider.KAKAO, "auth-code-1", "https://app/cb");
        verify(cookieFactory).setAuthCookies(eq(response), any(AuthTokens.class));
    }

    @Test
    void exchangeCode_unknownProvider_throws_AUTH_PROVIDER_UNSUPPORTED() {
        // parseProvider 에서 valueOf 실패 → AuthException 그대로 throw
        try {
            controller.exchangeCode("naver", new OauthCodeExchangeRequest("c", "https://app/cb"), response);
            org.junit.jupiter.api.Assertions.fail("expected AuthException");
        } catch (AuthException e) {
            assertThat(e.code()).isEqualTo("AUTH_PROVIDER_UNSUPPORTED");
        }
    }

    @Test
    void handleAuth_unsupportedProvider_returns400() {
        ResponseEntity<ApiResponse<Void>> res = controller.handleAuth(
                new AuthException("AUTH_PROVIDER_UNSUPPORTED", "x"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().status()).isFalse();
        assertThat(res.getBody().error().code()).isEqualTo("AUTH_PROVIDER_UNSUPPORTED");
    }

    @Test
    void handleAuth_oauthNotConfigured_returns503() {
        ResponseEntity<ApiResponse<Void>> res = controller.handleAuth(
                new AuthException("KAKAO_OAUTH_NOT_CONFIGURED", "missing rest-api-key"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().status()).isFalse();
        assertThat(res.getBody().error().code()).isEqualTo("KAKAO_OAUTH_NOT_CONFIGURED");
    }

    @Test
    void handleAuth_authInvalid_returns401() {
        ResponseEntity<ApiResponse<Void>> res = controller.handleAuth(
                new AuthException("AUTH_INVALID", "id token bad"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(res.getBody().error().code()).isEqualTo("AUTH_INVALID");
    }

    @Test
    void refresh_delegates_toService_andRotatesCookies() {
        when(authService.refresh(any())).thenReturn(new AuthTokens("a", "r", 900L));
        TokenResponse res = controller.refresh(new TokenPair("rt"), request, response);
        assertThat(res.refreshToken()).isEqualTo("r");
        verify(cookieFactory).setAuthCookies(eq(response), any(AuthTokens.class));
    }

    @Test
    void refresh_emptyBody_andNoCookie_throws_AUTH_INVALID() {
        // body 의 refreshToken 도 없고 쿠키도 없으면 즉시 AUTH_INVALID 400.
        when(request.getCookies()).thenReturn(null);
        try {
            controller.refresh(null, request, response);
            org.junit.jupiter.api.Assertions.fail("expected AuthException");
        } catch (AuthException e) {
            assertThat(e.code()).isEqualTo("AUTH_INVALID");
        }
    }

    @Test
    void logout_returns204_andClearsCookies() {
        ResponseEntity<Void> res = controller.logout(new TokenPair("rt"), request, response);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(authService).logout("rt");
        verify(cookieFactory).clearAuthCookies(response);
    }
}
