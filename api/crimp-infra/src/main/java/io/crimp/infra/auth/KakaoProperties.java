package io.crimp.infra.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth.oauth.kakao")
public record KakaoProperties(
        String clientId,
        String issuer,
        String jwksUri
) {}
