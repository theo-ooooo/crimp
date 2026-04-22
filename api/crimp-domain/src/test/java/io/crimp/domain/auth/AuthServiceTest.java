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

        jwtProps = new JwtProperties(
                "unit-test-secret-at-least-32-bytes-long-for-hs256-signing!",
                900L, 1_209_600L, "https://crimp.test");
        jwtProvider = new JwtProvider(jwtProps);

        refreshStore = new InMemoryRefreshStore();

        service = new AuthService(userRepo, oauthRepo, profileRepo, List.of(kakaoVerifier),
                jwtProvider, jwtProps, refreshStore);
    }

    @Test
    void exchange_existing_user_issuesTokens() {
        OauthUserInfo info = new OauthUserInfo(OauthProvider.KAKAO, "kakao-uid-1", "a@b.com");
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
        OauthUserInfo info = new OauthUserInfo(OauthProvider.KAKAO, "new-uid", "n@b.com");
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

    // --- helpers ---

    private void stubNewLogin(String providerUid, long userIdAssigned) {
        OauthUserInfo info = new OauthUserInfo(OauthProvider.KAKAO, providerUid, null);
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
