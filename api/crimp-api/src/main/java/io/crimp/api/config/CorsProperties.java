package io.crimp.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * CORS 허용 오리진·메서드·헤더 설정.
 *
 * application.yml 의 {@code crimp.cors} 아래 정의.
 * 프로덕션에서는 실제 도메인만, 로컬에서는 {@code http://localhost:3000} 등을 허용한다.
 */
@ConfigurationProperties(prefix = "crimp.cors")
public record CorsProperties(
        List<String> allowedOrigins,
        List<String> allowedOriginPatterns,
        List<String> allowedMethods,
        List<String> allowedHeaders,
        List<String> exposedHeaders,
        boolean allowCredentials,
        long maxAgeSeconds
) {
    public CorsProperties {
        if (allowedOrigins == null) allowedOrigins = List.of();
        if (allowedOriginPatterns == null) allowedOriginPatterns = List.of();
        if (allowedMethods == null) allowedMethods = List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS");
        if (allowedHeaders == null) allowedHeaders = List.of("*");
        if (exposedHeaders == null) exposedHeaders = List.of();
        if (maxAgeSeconds <= 0) maxAgeSeconds = 3600;
    }
}
