package io.crimp.domain.auth;

import java.time.Duration;
import java.util.Optional;

public interface RefreshTokenStore {
    void save(long userId, String jti, String tokenHash, Duration ttl);
    Optional<String> findHash(long userId, String jti);
    void delete(long userId, String jti);
    void deleteAllForUser(long userId);
}
