package io.crimp.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String brand,
        String env,
        Auth auth,
        Media media
) {
    public record Auth(
            long accessTokenTtlSeconds,
            long refreshTokenTtlSeconds,
            String jwtIssuer
    ) {}

    /**
     * 미디어 업로드 공통 설정. S3 자체의 bucket/region/credentials 는
     * {@code crimp-infra} 의 {@code S3Properties} ({@code app.media.s3.*}) 로 분리됨.
     */
    public record Media(
            String cdnBaseUrl,
            long presignedUrlTtlSeconds
    ) {}
}
