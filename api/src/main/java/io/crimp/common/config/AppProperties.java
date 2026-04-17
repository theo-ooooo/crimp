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

    public record Media(
            String s3Bucket,
            String cdnBaseUrl,
            long presignedUrlTtlSeconds
    ) {}
}
