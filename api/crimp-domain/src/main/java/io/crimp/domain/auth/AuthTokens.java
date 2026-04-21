package io.crimp.domain.auth;

public record AuthTokens(String accessToken, String refreshToken, long accessTtlSeconds) {}
