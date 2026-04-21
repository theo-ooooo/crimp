package io.crimp.domain.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * HS256 기반 Access / Refresh 토큰 발급·검증.
 * 운영 환경에서는 JwtProperties.secret 을 반드시 env/Secrets Manager 로 주입.
 */
@Component
public class JwtProvider {

    private static final String CLAIM_TYPE = "typ";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    private final JwtProperties props;
    private final SecretKey key;

    public JwtProvider(JwtProperties props) {
        this.props = props;
        byte[] raw = props.secret().getBytes(StandardCharsets.UTF_8);
        if (raw.length < 32) {
            throw new IllegalStateException("app.auth.jwt.secret 은 최소 32바이트(256bit) 이상이어야 함");
        }
        this.key = Keys.hmacShaKeyFor(raw);
    }

    public IssuedToken issueAccess(long userId, String userExtId) {
        return issue(userId, userExtId, TYPE_ACCESS, props.accessTtlSeconds());
    }

    public IssuedToken issueRefresh(long userId, String userExtId) {
        return issue(userId, userExtId, TYPE_REFRESH, props.refreshTtlSeconds());
    }

    private IssuedToken issue(long userId, String userExtId, String type, long ttlSeconds) {
        String jti = UUID.randomUUID().toString();
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(ttlSeconds);
        String token = Jwts.builder()
                .id(jti)
                .subject(String.valueOf(userId))
                .issuer(props.issuer())
                .issuedAt(java.util.Date.from(now))
                .expiration(java.util.Date.from(exp))
                .claims(Map.of(CLAIM_TYPE, type, "ext", userExtId))
                .signWith(key)
                .compact();
        return new IssuedToken(token, jti, exp);
    }

    public ParsedToken parseAccess(String token) {
        return parseExpectingType(token, TYPE_ACCESS);
    }

    public ParsedToken parseRefresh(String token) {
        return parseExpectingType(token, TYPE_REFRESH);
    }

    private ParsedToken parseExpectingType(String token, String expectedType) {
        Claims c = parseClaims(token);
        if (!expectedType.equals(c.get(CLAIM_TYPE, String.class))) {
            throw new JwtException("Unexpected token type");
        }
        return new ParsedToken(
                Long.parseLong(c.getSubject()),
                c.get("ext", String.class),
                c.getId(),
                c.getExpiration().toInstant()
        );
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .requireIssuer(props.issuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public record IssuedToken(String token, String jti, Instant expiresAt) {}

    public record ParsedToken(long userId, String userExtId, String jti, Instant expiresAt) {}
}
