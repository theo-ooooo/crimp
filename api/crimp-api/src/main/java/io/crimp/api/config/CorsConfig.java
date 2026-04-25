package io.crimp.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * CORS 설정 — {@link CorsProperties} 기반.
 *
 * {@code SecurityConfig#securityFilterChain} 에서 {@code http.cors(...)} 로 연결됨.
 * test 프로파일에서는 비활성 (테스트 컨텍스트에서 Bean 생성 비용 회피).
 *
 * Spring MVC 는 기본적으로 {@code HandlerMappingIntrospector} 를 같은 타입
 * ({@link CorsConfigurationSource}) 으로 노출하므로, 컨테이너에는 동일 타입 빈이 두 개
 * 존재할 수 있다. Security 의 CORS 설정을 이 빈으로 명시하기 위해 {@link Primary} 로 지정.
 */
@Configuration
@Profile("!test")
public class CorsConfig {

    @Bean
    @Primary
    public CorsConfigurationSource corsConfigurationSource(CorsProperties props) {
        CorsConfiguration config = new CorsConfiguration();
        if (!props.allowedOrigins().isEmpty()) {
            config.setAllowedOrigins(props.allowedOrigins());
        }
        if (!props.allowedOriginPatterns().isEmpty()) {
            config.setAllowedOriginPatterns(props.allowedOriginPatterns());
        }
        config.setAllowedMethods(props.allowedMethods());
        config.setAllowedHeaders(props.allowedHeaders());
        config.setExposedHeaders(props.exposedHeaders());
        config.setAllowCredentials(props.allowCredentials());
        config.setMaxAge(props.maxAgeSeconds());

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
