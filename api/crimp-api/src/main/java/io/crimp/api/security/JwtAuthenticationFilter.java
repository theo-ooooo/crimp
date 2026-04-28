package io.crimp.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.domain.auth.JwtProvider;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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

    public JwtAuthenticationFilter(JwtProvider jwtProvider, ObjectMapper objectMapper) {
        this.jwtProvider = jwtProvider;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            // 토큰 없음 — 인증 컨텍스트 설정 안 함. 공개 경로는 통과, 보호 경로는 EntryPoint 가 401 처리.
            chain.doFilter(request, response);
            return;
        }

        String token = header.substring(BEARER_PREFIX.length());
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
}
