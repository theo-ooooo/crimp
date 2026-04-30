package io.crimp.domain.auth;

import io.crimp.core.entity.enums.OauthProvider;
import io.crimp.core.entity.user.OauthIdentity;
import io.crimp.core.entity.user.User;
import io.crimp.core.repository.user.OauthIdentityRepository;
import io.crimp.core.repository.user.ProfileRepository;
import io.crimp.core.repository.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.lang.reflect.Field;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private UserRepository userRepo;
    private OauthIdentityRepository oauthRepo;
    private ProfileRepository profileRepo;
    private OauthIdTokenVerifier kakaoVerifier;
    private OauthCodeExchanger kakaoExchanger;
    private JwtProvider jwtProvider;
    private JwtProperties jwtProps;
    private InMemoryRefreshStore refreshStore;
    private AuthService service;

    @BeforeEach
    void setUp() {
        userRepo = mock(UserRepository.class);
        oauthRepo = mock(OauthIdentityRepository.class);
        profileRepo = mock(ProfileRepository.class);

        kakaoVerifier = mock(OauthIdTokenVerifier.class);
        when(kakaoVerifier.supports()).thenReturn(OauthProvider.KAKAO);

        kakaoExchanger = mock(OauthCodeExchanger.class);
        when(kakaoExchanger.supports()).thenReturn(OauthProvider.KAKAO);
        when(kakaoExchanger.isConfigured()).thenReturn(true);

        jwtProps = new JwtProperties(
                "unit-test-secret-at-least-32-bytes-long-for-hs256-signing!",
                900L, 1_209_600L, "https://crimp.test");
        jwtProvider = new JwtProvider(jwtProps);

        refreshStore = new InMemoryRefreshStore();

        service = new AuthService(userRepo, oauthRepo, profileRepo,
                List.of(kakaoVerifier), List.of(kakaoExchanger),
                jwtProvider, jwtProps, refreshStore);
    }

    /** [PR #112] Apple verifier 까지 등록된 service 인스턴스 — nonce SHA-256 비교 테스트용. */
    private AuthService serviceWithApple(OauthIdTokenVerifier appleVerifier) {
        return new AuthService(userRepo, oauthRepo, profileRepo,
                List.of(kakaoVerifier, appleVerifier), List.of(kakaoExchanger),
                jwtProvider, jwtProps, refreshStore);
    }

    @Test
    void exchange_existing_user_issuesTokens() {
        OauthUserInfo info = new OauthUserInfo(OauthProvider.KAKAO, "kakao-uid-1", "a@b.com", null);
        when(kakaoVerifier.verify("valid-token")).thenReturn(info);

        OauthIdentity identity = OauthIdentity.link(10L, OauthProvider.KAKAO, "kakao-uid-1");
        setField(identity, "userId", 10L);
        when(oauthRepo.findByProviderAndProviderUid(OauthProvider.KAKAO, "kakao-uid-1"))
                .thenReturn(Optional.of(identity));

        User existing = User.create("01HXXXXXXX", "hash", null);
        setField(existing, "id", 10L);
        when(userRepo.findById(10L)).thenReturn(Optional.of(existing));

        AuthTokens tokens = service.exchange(OauthProvider.KAKAO, "valid-token");

        assertThat(tokens.accessToken()).isNotBlank();
        assertThat(tokens.refreshToken()).isNotBlank();
        assertThat(tokens.accessTtlSeconds()).isEqualTo(900L);
        // 신규 가입 아님 → userRepo.save 호출 없음
        verify(userRepo, never()).save(any());
    }

    @Test
    void exchange_new_user_createsUserAndIdentity() {
        OauthUserInfo info = new OauthUserInfo(OauthProvider.KAKAO, "new-uid", "n@b.com", null);
        when(kakaoVerifier.verify("valid-token")).thenReturn(info);
        when(oauthRepo.findByProviderAndProviderUid(OauthProvider.KAKAO, "new-uid"))
                .thenReturn(Optional.empty());
        when(userRepo.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            setField(u, "id", 777L);
            return u;
        });

        AuthTokens tokens = service.exchange(OauthProvider.KAKAO, "valid-token");

        assertThat(tokens.accessToken()).isNotBlank();
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getExtId()).hasSize(26);

        ArgumentCaptor<OauthIdentity> idCaptor = ArgumentCaptor.forClass(OauthIdentity.class);
        verify(oauthRepo).save(idCaptor.capture());
        assertThat(idCaptor.getValue().getProvider()).isEqualTo(OauthProvider.KAKAO);
        assertThat(idCaptor.getValue().getProviderUid()).isEqualTo("new-uid");
    }

    @Test
    void exchange_unsupportedProvider_throws() {
        assertThatThrownBy(() -> service.exchange(OauthProvider.APPLE, "any"))
                .isInstanceOf(AuthException.class)
                .satisfies(e -> assertThat(((AuthException) e).code()).isEqualTo("AUTH_PROVIDER_UNSUPPORTED"));
    }

    @Test
    void exchange_verifierFailure_throws_AUTH_INVALID() {
        when(kakaoVerifier.verify(any())).thenThrow(new RuntimeException("bad sig"));
        assertThatThrownBy(() -> service.exchange(OauthProvider.KAKAO, "x"))
                .isInstanceOf(AuthException.class)
                .satisfies(e -> assertThat(((AuthException) e).code()).isEqualTo("AUTH_INVALID"));
    }

    // ===== exchangeCode (웹 v2 redirect flow) =====

    @Test
    void exchangeCode_existingUser_issuesTokens() {
        when(kakaoExchanger.exchange("auth-code-1", "https://app/callback"))
                .thenReturn("verified-id-token");

        OauthUserInfo info = new OauthUserInfo(OauthProvider.KAKAO, "kakao-uid-1", "a@b.com", null);
        when(kakaoVerifier.verify("verified-id-token")).thenReturn(info);

        OauthIdentity identity = OauthIdentity.link(10L, OauthProvider.KAKAO, "kakao-uid-1");
        setField(identity, "userId", 10L);
        when(oauthRepo.findByProviderAndProviderUid(OauthProvider.KAKAO, "kakao-uid-1"))
                .thenReturn(Optional.of(identity));

        User existing = User.create("01HXXXXXXX", "hash", null);
        setField(existing, "id", 10L);
        when(userRepo.findById(10L)).thenReturn(Optional.of(existing));

        AuthTokens tokens = service.exchangeCode(
                OauthProvider.KAKAO, "auth-code-1", "https://app/callback");

        assertThat(tokens.accessToken()).isNotBlank();
        assertThat(tokens.refreshToken()).isNotBlank();
        verify(userRepo, never()).save(any());
    }

    @Test
    void exchangeCode_newUser_createsAndIssues() {
        when(kakaoExchanger.exchange(eq("c"), eq("https://app/callback")))
                .thenReturn("verified-id-token");
        OauthUserInfo info = new OauthUserInfo(OauthProvider.KAKAO, "new-uid", null, null);
        when(kakaoVerifier.verify("verified-id-token")).thenReturn(info);
        when(oauthRepo.findByProviderAndProviderUid(OauthProvider.KAKAO, "new-uid"))
                .thenReturn(Optional.empty());
        when(userRepo.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            setField(u, "id", 999L);
            return u;
        });

        AuthTokens tokens = service.exchangeCode(
                OauthProvider.KAKAO, "c", "https://app/callback");

        assertThat(tokens.accessToken()).isNotBlank();
        verify(userRepo).save(any(User.class));
        verify(oauthRepo).save(any(OauthIdentity.class));
    }

    @Test
    void exchangeCode_kakaoCallFails_throws_AUTH_INVALID() {
        when(kakaoExchanger.exchange(any(), any()))
                .thenThrow(new RuntimeException("Kakao 401 invalid_grant"));

        assertThatThrownBy(() -> service.exchangeCode(
                OauthProvider.KAKAO, "bad-code", "https://app/callback"))
                .isInstanceOf(AuthException.class)
                .satisfies(e -> assertThat(((AuthException) e).code()).isEqualTo("AUTH_INVALID"));
    }

    @Test
    void exchangeCode_emptyIdTokenFromProvider_throws_AUTH_INVALID() {
        when(kakaoExchanger.exchange(any(), any())).thenReturn("");

        assertThatThrownBy(() -> service.exchangeCode(
                OauthProvider.KAKAO, "code", "https://app/callback"))
                .isInstanceOf(AuthException.class)
                .satisfies(e -> assertThat(((AuthException) e).code()).isEqualTo("AUTH_INVALID"));
    }

    @Test
    void exchangeCode_notConfigured_throws_KAKAO_OAUTH_NOT_CONFIGURED() {
        when(kakaoExchanger.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> service.exchangeCode(
                OauthProvider.KAKAO, "code", "https://app/callback"))
                .isInstanceOf(AuthException.class)
                .satisfies(e -> assertThat(((AuthException) e).code())
                        .isEqualTo("KAKAO_OAUTH_NOT_CONFIGURED"));
    }

    @Test
    void exchangeCode_unsupportedProvider_throws() {
        // APPLE 은 OauthCodeExchanger 미등록
        assertThatThrownBy(() -> service.exchangeCode(
                OauthProvider.APPLE, "code", "https://app/callback"))
                .isInstanceOf(AuthException.class)
                .satisfies(e -> assertThat(((AuthException) e).code())
                        .isEqualTo("AUTH_PROVIDER_UNSUPPORTED"));
    }

    @Test
    void refresh_rotates_and_invalidates_old_jti() {
        // 1) 최초 로그인으로 refresh 하나 발급
        stubNewLogin("uid-1", 42L);
        AuthTokens initial = service.exchange(OauthProvider.KAKAO, "token");
        assertThat(refreshStore.size()).isEqualTo(1);

        // 2) refresh → 새 토큰 + 이전 jti 삭제
        User u = User.create("01HUUUUUUU", null, null);
        setField(u, "id", 42L);
        when(userRepo.findById(42L)).thenReturn(Optional.of(u));

        AuthTokens rotated = service.refresh(initial.refreshToken());
        assertThat(rotated.refreshToken()).isNotEqualTo(initial.refreshToken());
        assertThat(refreshStore.size()).isEqualTo(1); // 이전 삭제 + 새 추가 = 여전히 1
    }

    @Test
    void refresh_reuse_detection_wipes_all_for_user() {
        stubNewLogin("uid-1", 42L);
        AuthTokens first = service.exchange(OauthProvider.KAKAO, "t");
        User u = User.create("01HUUUUUUU", null, null);
        setField(u, "id", 42L);
        when(userRepo.findById(42L)).thenReturn(Optional.of(u));

        service.refresh(first.refreshToken()); // 한 번 사용 → 정상

        // 이미 소비된 토큰 재사용 → 전체 무효화
        assertThatThrownBy(() -> service.refresh(first.refreshToken()))
                .isInstanceOf(AuthException.class)
                .satisfies(e -> assertThat(((AuthException) e).code()).isEqualTo("AUTH_INVALID"));
        assertThat(refreshStore.size()).isZero();
    }

    @Test
    void logout_deletes_refresh_entry() {
        stubNewLogin("uid-1", 42L);
        AuthTokens tokens = service.exchange(OauthProvider.KAKAO, "t");
        assertThat(refreshStore.size()).isEqualTo(1);

        service.logout(tokens.refreshToken());
        assertThat(refreshStore.size()).isZero();
    }

    @Test
    void logout_invalid_token_is_noop() {
        service.logout("not-a-jwt");
        assertThat(refreshStore.size()).isZero();
    }

    // ===== nonce verification (PR #112) =====

    @Test
    void exchange_kakao_nonceMatch_passes() {
        // Kakao 는 id_token 에 client 가 보낸 원본 nonce 가 그대로 박힘 → 평문 비교.
        OauthUserInfo info = new OauthUserInfo(
                OauthProvider.KAKAO, "kakao-uid-1", null, "client-nonce-xyz");
        when(kakaoVerifier.verify("tok")).thenReturn(info);
        when(oauthRepo.findByProviderAndProviderUid(OauthProvider.KAKAO, "kakao-uid-1"))
                .thenReturn(Optional.empty());
        when(userRepo.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            setField(u, "id", 1L);
            return u;
        });

        AuthTokens tokens = service.exchange(OauthProvider.KAKAO, "tok", "client-nonce-xyz");
        assertThat(tokens.accessToken()).isNotBlank();
    }

    @Test
    void exchange_kakao_nonceMismatch_throws_AUTH_INVALID() {
        OauthUserInfo info = new OauthUserInfo(
                OauthProvider.KAKAO, "kakao-uid-1", null, "server-side-nonce");
        when(kakaoVerifier.verify("tok")).thenReturn(info);

        assertThatThrownBy(() -> service.exchange(OauthProvider.KAKAO, "tok", "different-client-nonce"))
                .isInstanceOf(AuthException.class)
                .satisfies(e -> assertThat(((AuthException) e).code()).isEqualTo("AUTH_INVALID"));
    }

    @Test
    void exchange_kakao_idTokenMissingNonce_butExpected_throws_AUTH_INVALID() {
        // id_token 에 nonce 클레임이 없는데 client 는 nonce 를 보낸 경우 → 명확한 mismatch.
        OauthUserInfo info = new OauthUserInfo(OauthProvider.KAKAO, "kakao-uid-1", null, null);
        when(kakaoVerifier.verify("tok")).thenReturn(info);

        assertThatThrownBy(() -> service.exchange(OauthProvider.KAKAO, "tok", "client-nonce"))
                .isInstanceOf(AuthException.class)
                .satisfies(e -> assertThat(((AuthException) e).code()).isEqualTo("AUTH_INVALID"));
    }

    @Test
    void exchange_kakao_blankExpectedNonce_skipsVerification() {
        // 구버전 클라 호환 — expectedNonce 가 null/blank 이면 검증 자체를 건너뛴다.
        OauthUserInfo info = new OauthUserInfo(
                OauthProvider.KAKAO, "kakao-uid-1", null, "id-token-nonce");
        when(kakaoVerifier.verify("tok")).thenReturn(info);
        when(oauthRepo.findByProviderAndProviderUid(OauthProvider.KAKAO, "kakao-uid-1"))
                .thenReturn(Optional.empty());
        when(userRepo.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            setField(u, "id", 1L);
            return u;
        });

        AuthTokens tokens = service.exchange(OauthProvider.KAKAO, "tok", "  ");
        assertThat(tokens.accessToken()).isNotBlank();
    }

    @Test
    void exchange_apple_nonceMatchesSha256Hex_passes() {
        // Apple 은 client 가 보낸 nonce 를 SHA-256 해 hex 로 박는다.
        String rawNonce = "client-original-nonce";
        String expectedHashed = sha256Hex(rawNonce);

        OauthIdTokenVerifier appleVerifier = mock(OauthIdTokenVerifier.class);
        when(appleVerifier.supports()).thenReturn(OauthProvider.APPLE);
        when(appleVerifier.verify("apple-tok")).thenReturn(
                new OauthUserInfo(OauthProvider.APPLE, "apple-uid-1", null, expectedHashed));
        AuthService svc = serviceWithApple(appleVerifier);

        when(oauthRepo.findByProviderAndProviderUid(OauthProvider.APPLE, "apple-uid-1"))
                .thenReturn(Optional.empty());
        when(userRepo.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            setField(u, "id", 2L);
            return u;
        });

        AuthTokens tokens = svc.exchange(OauthProvider.APPLE, "apple-tok", rawNonce);
        assertThat(tokens.accessToken()).isNotBlank();
    }

    @Test
    void exchange_apple_rawNoncePassedAsTokenNonce_throws_AUTH_INVALID() {
        // 흔한 클라 버그 시나리오 — Apple 인데 hashing 을 안 거치고 raw 를 비교하면 mismatch.
        String rawNonce = "client-original-nonce";

        OauthIdTokenVerifier appleVerifier = mock(OauthIdTokenVerifier.class);
        when(appleVerifier.supports()).thenReturn(OauthProvider.APPLE);
        when(appleVerifier.verify("apple-tok")).thenReturn(
                new OauthUserInfo(OauthProvider.APPLE, "apple-uid-1", null, rawNonce));
        AuthService svc = serviceWithApple(appleVerifier);

        assertThatThrownBy(() -> svc.exchange(OauthProvider.APPLE, "apple-tok", rawNonce))
                .isInstanceOf(AuthException.class)
                .satisfies(e -> assertThat(((AuthException) e).code()).isEqualTo("AUTH_INVALID"));
    }

    @Test
    void exchangeCode_propagatesNonceToVerification() {
        // exchangeCode 도 expectedNonce 를 끝까지 전달해 같은 검증 경로를 탄다.
        when(kakaoExchanger.exchange(eq("c"), eq("https://app/cb"))).thenReturn("verified-id-token");
        when(kakaoVerifier.verify("verified-id-token")).thenReturn(
                new OauthUserInfo(OauthProvider.KAKAO, "uid", null, "server-nonce"));

        assertThatThrownBy(() -> service.exchangeCode(
                OauthProvider.KAKAO, "c", "https://app/cb", "client-nonce-mismatch"))
                .isInstanceOf(AuthException.class)
                .satisfies(e -> assertThat(((AuthException) e).code()).isEqualTo("AUTH_INVALID"));
    }

    private static String sha256Hex(String value) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(
                    md.digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    // --- helpers ---

    private void stubNewLogin(String providerUid, long userIdAssigned) {
        OauthUserInfo info = new OauthUserInfo(OauthProvider.KAKAO, providerUid, null, null);
        when(kakaoVerifier.verify(any())).thenReturn(info);
        when(oauthRepo.findByProviderAndProviderUid(OauthProvider.KAKAO, providerUid))
                .thenReturn(Optional.empty());
        when(userRepo.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            setField(u, "id", userIdAssigned);
            return u;
        });
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field f = findField(target.getClass(), name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Field findField(Class<?> c, String name) throws NoSuchFieldException {
        Class<?> cur = c;
        while (cur != null) {
            try {
                return cur.getDeclaredField(name);
            } catch (NoSuchFieldException e) {
                cur = cur.getSuperclass();
            }
        }
        throw new NoSuchFieldException(name);
    }

    /** 테스트용 in-memory RefreshTokenStore. */
    private static final class InMemoryRefreshStore implements RefreshTokenStore {
        private final Map<String, String> map = new HashMap<>();

        @Override public void save(long userId, String jti, String tokenHash, Duration ttl) {
            map.put(key(userId, jti), tokenHash);
        }
        @Override public Optional<String> findHash(long userId, String jti) {
            return Optional.ofNullable(map.get(key(userId, jti)));
        }
        @Override public void delete(long userId, String jti) {
            map.remove(key(userId, jti));
        }
        @Override public void deleteAllForUser(long userId) {
            map.keySet().removeIf(k -> k.startsWith(userId + ":"));
        }
        int size() { return map.size(); }
        private static String key(long userId, String jti) { return userId + ":" + jti; }
    }
}
