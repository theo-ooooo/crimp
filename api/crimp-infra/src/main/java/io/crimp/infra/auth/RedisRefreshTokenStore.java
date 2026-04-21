package io.crimp.infra.auth;

import io.crimp.domain.auth.RefreshTokenStore;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;

@Component
@Profile("!test")
public class RedisRefreshTokenStore implements RefreshTokenStore {

    private final StringRedisTemplate redis;

    public RedisRefreshTokenStore(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public void save(long userId, String jti, String tokenHash, Duration ttl) {
        redis.opsForValue().set(key(userId, jti), tokenHash, ttl);
    }

    @Override
    public Optional<String> findHash(long userId, String jti) {
        return Optional.ofNullable(redis.opsForValue().get(key(userId, jti)));
    }

    @Override
    public void delete(long userId, String jti) {
        redis.delete(key(userId, jti));
    }

    @Override
    public void deleteAllForUser(long userId) {
        Set<String> keys = redis.keys("refresh:" + userId + ":*");
        if (!keys.isEmpty()) {
            redis.delete(keys);
        }
    }

    private static String key(long userId, String jti) {
        return "refresh:" + userId + ":" + jti;
    }
}
