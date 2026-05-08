package io.crimp.api.security;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtFilter,
            RestAuthenticationEntryPoint authEntryPoint,
            RestAccessDeniedHandler accessDeniedHandler,
            @Qualifier("corsConfigurationSource") ObjectProvider<CorsConfigurationSource> corsSource)
            throws Exception {
        // Spring MVC 의 HandlerMappingIntrospector 도 CorsConfigurationSource 타입이라
        // 이름("corsConfigurationSource") 으로 고정해 우리가 등록한 빈만 사용.
        // test 프로파일에서는 CorsConfig 가 비활성화되므로 getIfAvailable() 로 null 허용.
        CorsConfigurationSource cors = corsSource.getIfAvailable();
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors != null
                        ? c -> c.configurationSource(cors)
                        : Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/health").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        // admin 영역은 ADMIN 권한 보유자만 — 일반 인증으로 접근 불가 (gyms 등 일반 경로보다 먼저).
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        // 루트 목록은 인증 필요 — gyms permitAll 패턴보다 먼저 선언해 우선순위 확보
                        .requestMatchers(HttpMethod.GET, "/api/v1/gyms/*/routes").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/crews", "/api/v1/crews/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/gyms", "/api/v1/gyms/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/info", "/actuator/prometheus").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
