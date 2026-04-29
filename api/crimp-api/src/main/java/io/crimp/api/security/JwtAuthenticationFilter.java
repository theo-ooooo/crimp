package io.crimp.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.domain.auth.JwtProvider;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtProvider jwtProvider;
    private final ObjectMapper objectMapper;
    /**
     * AuthCookieFactory 는 {@code !test} 프로파일이라 단위 테스트에서 빈이 없을 수 있음.
     * ObjectProvider 로 lazy 주입 — 없으면 cookie fallback skip 하고 Bearer 만 처리한다.
     */
    private final ObjectProvider<AuthCookieFactory> cookieFactoryProvider;

    public JwtAuthenticationFilter(
            JwtProvider jwtProvider,
            ObjectMapper objectMapper,
            ObjectProvider<AuthCookieFactory> cookieFactoryProvider) {
        this.jwtProvider = jwtProvider;
        this.objectMapper = objectMapper;
        this.cookieFactoryProvider = cookieFactoryProvider;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String token = extractToken(request);
        if (token == null) {
            // 토큰 없음 — 인증 컨텍스트 설정 안 함. 공개 경로는 통과, 보호 경로는 EntryPoint 가 401 처리.
            chain.doFilter(request, response);
            return;
        }

        try {
            JwtProvider.ParsedToken parsed = jwtProvider.parseAccess(token);
            CrimpPrincipal principal = new CrimpPrincipal(parsed.userId(), parsed.userExtId());
            // role claim 을 Spring Security 권한으로 매핑 — `ROLE_<UserRole.name()>` 컨벤션.
            // hasRole("ADMIN") / @PreAuthorize("hasRole('ADMIN')") 등이 그대로 동작.
            var authority = new SimpleGrantedAuthority("ROLE_" + parsed.role().name());
            var auth = new UsernamePasswordAuthenticationToken(
                    principal, null, List.of(authority));
            SecurityContextHolder.getContext().setAuthentication(auth);
            chain.doFilter(request, response);
        } catch (JwtException e) {
            // 토큰이 존재하지만 유효하지 않음 (만료·변조·잘못된 타입) — 즉시 401 AUTH_INVALID.
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            objectMapper.writeValue(
                    response.getOutputStream(),
                    ApiResponse.failure(ErrorBody.of("AUTH_INVALID", "Invalid or expired access token")));
        }
    }

    /**
     * Authorization Bearer 헤더 우선, 없으면 access 쿠키에서 토큰 추출 (PR #94, HttpOnly 전환).
     * 두 곳 모두 없으면 null 반환 — 호출자가 unauthenticated 로 처리.
     */
    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        // Bearer 없음 — 쿠키 fallback. AuthCookieFactory 빈이 없으면 (단위 테스트 등) skip.
        AuthCookieFactory factory = cookieFactoryProvider.getIfAvailable();
        if (factory == null) return null;
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        String name = factory.accessCookieName();
        for (Cookie c : cookies) {
            if (name.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                return c.getValue();
            }
        }
        return null;
    }
}
