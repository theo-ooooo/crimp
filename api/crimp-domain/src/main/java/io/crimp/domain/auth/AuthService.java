package io.crimp.domain.auth;

import io.crimp.common.id.UlidGenerator;
import io.crimp.core.entity.enums.OauthProvider;
import io.crimp.core.entity.user.OauthIdentity;
import io.crimp.core.entity.user.Profile;
import io.crimp.core.entity.user.User;
import io.crimp.core.repository.user.OauthIdentityRepository;
import io.crimp.core.repository.user.ProfileRepository;
import io.crimp.core.repository.user.UserRepository;
import io.jsonwebtoken.JwtException;
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
@org.springframework.context.annotation.Profile("!test")
public class AuthService {

    private final UserRepository userRepository;
    private final OauthIdentityRepository oauthIdentityRepository;
    private final ProfileRepository profileRepository;
    private final Map<OauthProvider, OauthIdTokenVerifier> verifiers;
    private final Map<OauthProvider, OauthCodeExchanger> codeExchangers;
    private final JwtProvider jwtProvider;
    private final JwtProperties jwtProperties;
    private final RefreshTokenStore refreshStore;

    public AuthService(
            UserRepository userRepository,
            OauthIdentityRepository oauthIdentityRepository,
            ProfileRepository profileRepository,
            List<OauthIdTokenVerifier> verifierList,
            List<OauthCodeExchanger> codeExchangerList,
            JwtProvider jwtProvider,
            JwtProperties jwtProperties,
            RefreshTokenStore refreshStore
    ) {
        this.userRepository = userRepository;
        this.oauthIdentityRepository = oauthIdentityRepository;
        this.profileRepository = profileRepository;
        this.verifiers = verifierList.stream().collect(
                java.util.stream.Collectors.toMap(OauthIdTokenVerifier::supports, v -> v));
        this.codeExchangers = codeExchangerList.stream().collect(
                java.util.stream.Collectors.toMap(OauthCodeExchanger::supports, v -> v));
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

    /**
     * 웹 v2 redirect 흐름 — provider authorization_code 교환.
     *
     * <p>(1) provider /oauth/token 으로 code → id_token 교환,
     * (2) 기존 {@link OauthIdTokenVerifier} 로 id_token 검증,
     * (3) 사용자 매칭/생성 → JWT 발급. 결과는 기존 {@link #exchange} 와 동일한
     * {@link AuthTokens} 형태.
     *
     * <p>provider 키가 미설정이면 {@code KAKAO_OAUTH_NOT_CONFIGURED} (provider 명 prefix
     * 적용) 으로 차단한다 — 운영 키 발급 전 단계에서도 500 대신 503 으로 명시 응답.
     */
    @Transactional
    public AuthTokens exchangeCode(OauthProvider provider, String code, String redirectUri) {
        OauthCodeExchanger exchanger = codeExchangers.get(provider);
        if (exchanger == null) {
            throw new AuthException("AUTH_PROVIDER_UNSUPPORTED",
                    "Unsupported provider for code exchange: " + provider);
        }
        if (!exchanger.isConfigured()) {
            // provider 별 prefix — 현 시점은 KAKAO 만 지원.
            throw new AuthException(
                    provider.name() + "_OAUTH_NOT_CONFIGURED",
                    provider + " OAuth client credentials are not configured");
        }
        String idToken;
        try {
            idToken = exchanger.exchange(code, redirectUri);
        } catch (RuntimeException e) {
            throw new AuthException("AUTH_INVALID",
                    "Authorization code exchange failed: " + e.getMessage());
        }
        if (idToken == null || idToken.isBlank()) {
            throw new AuthException("AUTH_INVALID", "Provider returned empty id_token");
        }
        return exchange(provider, idToken);
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
        // 기본 닉네임은 user.id 기반 — DB BIGINT AUTO_INCREMENT 가 유일성 보장. 온보딩 UI 에서 유저가 변경.
        String defaultNickname = "crimper_" + user.getId();
        profileRepository.save(Profile.create(user.getId(), defaultNickname));
        return user;
    }

    private AuthTokens issueTokens(User user) {
        // role 은 항상 DB 기준값으로 발급 — 토큰 안에 박혀 있다가 권한 상승된 사용자가 그대로 남는
        // 회귀를 막는다 (refresh 시점에도 DB 재조회 → 본 메서드 재진입).
        JwtProvider.IssuedToken access = jwtProvider.issueAccess(user.getId(), user.getExtId(), user.getRole());
        JwtProvider.IssuedToken refresh = jwtProvider.issueRefresh(user.getId(), user.getExtId(), user.getRole());
        refreshStore.save(
                user.getId(),
                refresh.jti(),
                hash(refresh.token()),
                Duration.between(Instant.now(), refresh.expiresAt()));
        return new AuthTokens(
                access.token(), refresh.token(),
                jwtProperties.accessTtlSeconds(), jwtProperties.refreshTtlSeconds());
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
