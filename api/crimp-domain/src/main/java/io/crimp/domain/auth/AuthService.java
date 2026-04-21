package io.crimp.domain.auth;

import io.crimp.common.id.UlidGenerator;
import io.crimp.core.entity.enums.OauthProvider;
import io.crimp.core.entity.user.OauthIdentity;
import io.crimp.core.entity.user.User;
import io.crimp.core.repository.user.OauthIdentityRepository;
import io.crimp.core.repository.user.UserRepository;
import io.jsonwebtoken.JwtException;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Profile("!test")
public class AuthService {

    private final UserRepository userRepository;
    private final OauthIdentityRepository oauthIdentityRepository;
    private final Map<OauthProvider, OauthIdTokenVerifier> verifiers;
    private final JwtProvider jwtProvider;
    private final JwtProperties jwtProperties;
    private final RefreshTokenStore refreshStore;

    public AuthService(
            UserRepository userRepository,
            OauthIdentityRepository oauthIdentityRepository,
            List<OauthIdTokenVerifier> verifierList,
            JwtProvider jwtProvider,
            JwtProperties jwtProperties,
            RefreshTokenStore refreshStore
    ) {
        this.userRepository = userRepository;
        this.oauthIdentityRepository = oauthIdentityRepository;
        this.verifiers = verifierList.stream().collect(
                java.util.stream.Collectors.toMap(OauthIdTokenVerifier::supports, v -> v));
        this.jwtProvider = jwtProvider;
        this.jwtProperties = jwtProperties;
        this.refreshStore = refreshStore;
    }

    @Transactional
    public AuthTokens exchange(OauthProvider provider, String idToken) {
        OauthIdTokenVerifier verifier = verifiers.get(provider);
        if (verifier == null) {
            throw new AuthException("AUTH_PROVIDER_UNSUPPORTED", "Unsupported provider: " + provider);
        }
        OauthUserInfo info;
        try {
            info = verifier.verify(idToken);
        } catch (RuntimeException e) {
            throw new AuthException("AUTH_INVALID", "ID token verification failed: " + e.getMessage());
        }

        User user = oauthIdentityRepository
                .findByProviderAndProviderUid(info.provider(), info.providerUid())
                .map(id -> userRepository.findById(id.getUserId())
                        .orElseThrow(() -> new AuthException("AUTH_USER_MISSING", "Linked user not found")))
                .orElseGet(() -> createUser(info));
        user.markLoggedIn();

        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public AuthTokens refresh(String refreshToken) {
        JwtProvider.ParsedToken parsed;
        try {
            parsed = jwtProvider.parseRefresh(refreshToken);
        } catch (JwtException e) {
            throw new AuthException("AUTH_INVALID", "Refresh token invalid");
        }

        Optional<String> storedHash = refreshStore.findHash(parsed.userId(), parsed.jti());
        String currentHash = hash(refreshToken);
        if (storedHash.isEmpty() || !storedHash.get().equals(currentHash)) {
            // 재사용·탈취 의심 — 해당 유저 전체 refresh 즉시 무효화
            refreshStore.deleteAllForUser(parsed.userId());
            throw new AuthException("AUTH_INVALID", "Refresh token reuse detected");
        }

        refreshStore.delete(parsed.userId(), parsed.jti());

        User user = userRepository.findById(parsed.userId())
                .orElseThrow(() -> new AuthException("AUTH_USER_MISSING", "User not found"));
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public void logout(String refreshToken) {
        try {
            JwtProvider.ParsedToken parsed = jwtProvider.parseRefresh(refreshToken);
            refreshStore.delete(parsed.userId(), parsed.jti());
        } catch (JwtException ignored) {
            // 만료/변조된 refresh 는 그냥 무시
        }
    }

    private User createUser(OauthUserInfo info) {
        String extId = UlidGenerator.next();
        byte[] emailBytes = info.email() != null ? info.email().getBytes(StandardCharsets.UTF_8) : null;
        String emailHash = info.email() != null ? hash(info.email().toLowerCase()) : null;
        User user = User.create(extId, emailHash, emailBytes);
        userRepository.save(user);
        oauthIdentityRepository.save(
                OauthIdentity.link(user.getId(), info.provider(), info.providerUid()));
        return user;
    }

    private AuthTokens issueTokens(User user) {
        JwtProvider.IssuedToken access = jwtProvider.issueAccess(user.getId(), user.getExtId());
        JwtProvider.IssuedToken refresh = jwtProvider.issueRefresh(user.getId(), user.getExtId());
        refreshStore.save(
                user.getId(),
                refresh.jti(),
                hash(refresh.token()),
                Duration.between(Instant.now(), refresh.expiresAt()));
        return new AuthTokens(access.token(), refresh.token(), jwtProperties.accessTtlSeconds());
    }

    private static String hash(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
