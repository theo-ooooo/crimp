package io.crimp.domain.user;

import io.crimp.common.config.AppProperties;
import io.crimp.core.entity.crew.Crew;
import io.crimp.core.entity.crew.CrewJoinRequest;
import io.crimp.core.entity.crew.CrewMember;
import io.crimp.core.entity.enums.CrewJoinRequestStatus;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewMemberRole;
import io.crimp.core.entity.enums.CrewMemberStatus;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.core.entity.enums.MediaKind;
import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.core.entity.enums.MediaUsage;
import io.crimp.core.entity.enums.UserStatus;
import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.media.MediaAsset;
import io.crimp.core.entity.media.MediaImageVariant;
import io.crimp.core.entity.user.Profile;
import io.crimp.core.entity.user.User;
import io.crimp.core.repository.crew.CrewJoinRequestRepository;
import io.crimp.core.repository.crew.CrewMemberRepository;
import io.crimp.core.repository.crew.CrewRepository;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.media.MediaAssetRepository;
import io.crimp.core.repository.media.MediaImageVariantRepository;
import io.crimp.core.repository.user.ProfileRepository;
import io.crimp.core.repository.user.UserRepository;
import io.crimp.domain.auth.RefreshTokenStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    private UserRepository userRepo;
    private ProfileRepository profileRepo;
    private GymRepository gymRepo;
    private RefreshTokenStore refreshTokenStore;
    private CrewJoinRequestRepository crewJoinRequestRepo;
    private CrewMemberRepository crewMemberRepo;
    private CrewRepository crewRepo;
    private MediaAssetRepository mediaAssetRepo;
    private MediaImageVariantRepository mediaImageVariantRepo;
    private UserService service;

    @BeforeEach
    void setUp() {
        userRepo = mock(UserRepository.class);
        profileRepo = mock(ProfileRepository.class);
        gymRepo = mock(GymRepository.class);
        refreshTokenStore = mock(RefreshTokenStore.class);
        crewJoinRequestRepo = mock(CrewJoinRequestRepository.class);
        crewMemberRepo = mock(CrewMemberRepository.class);
        crewRepo = mock(CrewRepository.class);
        mediaAssetRepo = mock(MediaAssetRepository.class);
        mediaImageVariantRepo = mock(MediaImageVariantRepository.class);
        service = new UserService(userRepo, profileRepo, gymRepo, refreshTokenStore,
                crewJoinRequestRepo, crewMemberRepo, crewRepo,
                mediaAssetRepo, mediaImageVariantRepo, appProps());
    }

    @Test
    void getMe_returnsView() {
        User user = user(1L, "01HUUUUUUU");
        Profile profile = Profile.create(1L, "crimper_abc");
        profile.updateBio("hi");

        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        ProfileView view = service.getMe(1L);
        assertThat(view.extId()).isEqualTo("01HUUUUUUU");
        assertThat(view.nickname()).isEqualTo("crimper_abc");
        assertThat(view.nicknameConfigured()).isFalse();
        assertThat(view.bio()).isEqualTo("hi");
    }

    @Test
    void getMe_userNotFound_throws() {
        when(userRepo.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getMe(99L))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("USER_NOT_FOUND"));
    }

    @Test
    void getMe_deletedUser_throws_notFound() {
        User user = user(1L, "01HDELETED_");
        user.deleteAccount();
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.getMe(1L))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("USER_NOT_FOUND"));
    }

    @Test
    void getMe_profileMissing_throws() {
        when(userRepo.findById(1L)).thenReturn(Optional.of(user(1L, "x")));
        when(profileRepo.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getMe(1L))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("PROFILE_MISSING"));
    }

    @Test
    void getPublicProfile_by_extId() {
        User user = user(5L, "01HPUBLIC__");
        Profile profile = Profile.create(5L, "foo");
        when(userRepo.findByExtId("01HPUBLIC__")).thenReturn(Optional.of(user));
        when(profileRepo.findById(5L)).thenReturn(Optional.of(profile));

        ProfileView view = service.getPublicProfile("01HPUBLIC__");
        assertThat(view.nickname()).isEqualTo("foo");
    }

    @Test
    void updateMyProfile_all_fields_applied() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "old_nick");
        Gym gym = gym(9L, "01HGYM_NEW", "더클라임 강남", "더클라임");
        MediaAsset avatar = readyAvatarImage(7L, 1L, "media/users/1/avatar/image/avatar.jpg");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(profileRepo.existsByNickname("new_nick")).thenReturn(false);
        when(mediaAssetRepo.findById(7L)).thenReturn(Optional.of(avatar));
        // numeric id 직접 전달 (호환 모드) — 결과 뷰 빌드 시 resolveMainGym 이 findById 로 조회.
        when(gymRepo.findById(9L)).thenReturn(Optional.of(gym));

        var cmd = new UpdateProfileCommand("new_nick", "new bio", (byte) 4, 9L, null, false, 7L);
        ProfileView view = service.updateMyProfile(1L, cmd);

        assertThat(view.nickname()).isEqualTo("new_nick");
        assertThat(view.nicknameConfigured()).isTrue();
        assertThat(view.bio()).isEqualTo("new bio");
        assertThat(view.levelSelf()).isEqualTo((byte) 4);
        assertThat(view.mainGymId()).isEqualTo(9L);
        assertThat(view.avatarMediaId()).isEqualTo(7L);
        assertThat(view.avatarUrl()).isNull();
        assertThat(view.mainGym()).isNotNull();
        assertThat(view.mainGym().extId()).isEqualTo("01HGYM_NEW");
    }

    @Test
    void updateMyProfile_avatarUrl_prefersImageVariantPath() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "old_nick");
        MediaAsset avatar = readyAvatarImage(7L, 1L, "media/users/1/avatar/image/avatar.jpg");
        MediaImageVariant variant = mock(MediaImageVariant.class);
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(mediaAssetRepo.findById(7L)).thenReturn(Optional.of(avatar));
        when(variant.getPath()).thenReturn("media/users/1/avatar/image/avatar.webp");
        when(mediaImageVariantRepo.findFirstByMediaIdAndStatusAndPrimaryTrueOrderByIdDesc(7L, MediaStatus.READY))
                .thenReturn(Optional.of(variant));

        var cmd = new UpdateProfileCommand(null, null, null, null, null, false, 7L);
        ProfileView view = service.updateMyProfile(1L, cmd);

        assertThat(view.avatarMediaId()).isEqualTo(7L);
        assertThat(view.avatarUrl()).isEqualTo("https://cdn.crimp.test/media/users/1/avatar/image/avatar.webp");
    }

    @Test
    void updateMyProfile_nickname_taken_throws() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "mine");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(profileRepo.existsByNickname("taken")).thenReturn(true);

        var cmd = new UpdateProfileCommand("taken", null, null, null, null, false, null);
        assertThatThrownBy(() -> service.updateMyProfile(1L, cmd))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("NICKNAME_TAKEN"));
    }

    @Test
    void updateMyProfile_deletedPrefix_throws() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "mine");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        var cmd = new UpdateProfileCommand("deleted_1", null, null, null, null, false, null);
        assertThatThrownBy(() -> service.updateMyProfile(1L, cmd))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("INVALID_NICKNAME"));
    }

    @Test
    void updateMyProfile_same_nickname_skipsExistsCheck() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "mine");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        var cmd = new UpdateProfileCommand("mine", "bio only", null, null, null, false, null);
        ProfileView view = service.updateMyProfile(1L, cmd);

        verify(profileRepo, never()).existsByNickname(any());
        assertThat(view.nicknameConfigured()).isTrue();
    }

    @Test
    void updateMyProfile_same_nickname_with_leading_trailing_space_skipsExistsCheck() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "mine");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        var cmd = new UpdateProfileCommand("  mine  ", null, null, null, null, false, null);
        ProfileView view = service.updateMyProfile(1L, cmd);

        verify(profileRepo, never()).existsByNickname(any());
        assertThat(view.nickname()).isEqualTo("mine");
        assertThat(view.nicknameConfigured()).isTrue();
    }

    @Test
    void updateMyProfile_trims_nickname_when_changing() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "old");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(profileRepo.existsByNickname("new_nick")).thenReturn(false);

        var cmd = new UpdateProfileCommand("  new_nick  ", null, null, null, null, false, null);
        ProfileView view = service.updateMyProfile(1L, cmd);

        verify(profileRepo).existsByNickname("new_nick");
        assertThat(view.nickname()).isEqualTo("new_nick");
    }

    @Test
    void updateMyProfile_nickname_too_short_after_trim_throws() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "old");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        var cmd = new UpdateProfileCommand(" a ", null, null, null, null, false, null);
        assertThatThrownBy(() -> service.updateMyProfile(1L, cmd))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("INVALID_NICKNAME"));
    }

    @Test
    void updateMyProfile_null_fields_preserve_existing() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "keep");
        profile.updateBio("existing bio");
        profile.updateLevel((byte) 2);
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        var cmd = new UpdateProfileCommand(null, null, null, null, null, false, null);
        ProfileView view = service.updateMyProfile(1L, cmd);

        assertThat(view.nickname()).isEqualTo("keep");
        assertThat(view.bio()).isEqualTo("existing bio");
        assertThat(view.levelSelf()).isEqualTo((byte) 2);
    }

    @Test
    void updateMyProfile_resolves_mainGymExtId_to_id() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        Gym gym = gym(42L, "01HGYM__EXT", "더클라임 홍대", "더클라임");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(gymRepo.findByExtId("01HGYM__EXT")).thenReturn(Optional.of(gym));
        when(gymRepo.findById(42L)).thenReturn(Optional.of(gym));

        var cmd = new UpdateProfileCommand(null, null, null, null, "01HGYM__EXT", false, null);
        ProfileView view = service.updateMyProfile(1L, cmd);

        assertThat(view.mainGymId()).isEqualTo(42L);
        assertThat(view.mainGym()).isNotNull();
        assertThat(view.mainGym().extId()).isEqualTo("01HGYM__EXT");
        assertThat(view.mainGym().name()).isEqualTo("더클라임 홍대");
        assertThat(view.mainGym().brand()).isEqualTo("더클라임");
    }

    @Test
    void updateMyProfile_with_clearMainGym_true_sets_null() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        profile.updateMainGym(99L); // 기존 주 암장 보유
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        var cmd = new UpdateProfileCommand(null, null, null, null, null, true, null);
        ProfileView view = service.updateMyProfile(1L, cmd);

        assertThat(view.mainGymId()).isNull();
        assertThat(view.mainGym()).isNull();
    }

    @Test
    void updateMyProfile_with_unknown_mainGymExtId_throws_404() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(gymRepo.findByExtId("01HNOTEXIST")).thenReturn(Optional.empty());

        var cmd = new UpdateProfileCommand(null, null, null, null, "01HNOTEXIST", false, null);
        assertThatThrownBy(() -> service.updateMyProfile(1L, cmd))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("MAIN_GYM_NOT_FOUND"));
    }

    @Test
    void updateMyProfile_mainGymExtId_and_clearMainGym_both_set_throws_validation() {
        // 사전 검증이므로 repo 호출 자체가 발생하지 않도록 확인.
        var cmd = new UpdateProfileCommand(null, null, null, null, "01HGYM_X", true, null);
        assertThatThrownBy(() -> service.updateMyProfile(1L, cmd))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("INVALID_MAIN_GYM_REQUEST"));
        verify(userRepo, never()).findById(any());
    }

    @Test
    void updateMyProfile_mainGymId_and_clearMainGym_both_set_throws_validation() {
        // mainGymId(호환) 도 clearMainGym 과 동시 set 시 거부.
        var cmd = new UpdateProfileCommand(null, null, null, 7L, null, true, null);
        assertThatThrownBy(() -> service.updateMyProfile(1L, cmd))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("INVALID_MAIN_GYM_REQUEST"));
    }

    @Test
    void updateMyProfile_mainGymExtId_and_mainGymId_both_set_throws_validation() {
        // I1: mainGymExtId 와 mainGymId 동시 set 도 거부 (우선순위 silent 적용 회피).
        var cmd = new UpdateProfileCommand(null, null, null, 7L, "01HGYM_X", false, null);
        assertThatThrownBy(() -> service.updateMyProfile(1L, cmd))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("INVALID_MAIN_GYM_REQUEST"));
        verify(userRepo, never()).findById(any());
    }

    @Test
    void updateMyProfile_inactive_mainGym_extId_throws_404() {
        // I3: CLOSED/PENDING gym 은 mainGym 으로 set 불가.
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        Gym closedGym = gym(7L, "01HGYM_CLOSED", "폐업한 암장", null);
        setField(closedGym, "status", GymStatus.CLOSED);
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(gymRepo.findByExtId("01HGYM_CLOSED")).thenReturn(Optional.of(closedGym));

        var cmd = new UpdateProfileCommand(null, null, null, null, "01HGYM_CLOSED", false, null);
        assertThatThrownBy(() -> service.updateMyProfile(1L, cmd))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("MAIN_GYM_NOT_FOUND"));
    }

    @Test
    void getPublicProfile_does_not_resolve_mainGym() {
        // I4: 공개 프로필은 mainGym 정보를 노출하지 않으므로 gymRepo 조회 자체가 발생하지 않아야.
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        profile.updateMainGym(7L);
        when(userRepo.findByExtId("01HU")).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        ProfileView view = service.getPublicProfile("01HU");

        assertThat(view.mainGymId()).isEqualTo(7L);
        // mainGym 객체는 항상 null (공개 프로필 컨버터 사용)
        assertThat(view.mainGym()).isNull();
        verify(gymRepo, never()).findById(any());
    }

    @Test
    void getMe_returns_resolved_mainGym_object_when_set() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        profile.updateMainGym(7L);
        Gym gym = gym(7L, "01HGYM_SET", "클라이밍파크 서초", null);
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(gymRepo.findById(7L)).thenReturn(Optional.of(gym));

        ProfileView view = service.getMe(1L);

        assertThat(view.mainGymId()).isEqualTo(7L);
        assertThat(view.mainGym()).isNotNull();
        assertThat(view.mainGym().extId()).isEqualTo("01HGYM_SET");
        assertThat(view.mainGym().name()).isEqualTo("클라이밍파크 서초");
        assertThat(view.mainGym().brand()).isNull();
    }

    @Test
    void getMe_returns_null_mainGym_when_unset() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk"); // mainGymId 미설정
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        ProfileView view = service.getMe(1L);

        assertThat(view.mainGymId()).isNull();
        assertThat(view.mainGym()).isNull();
        verify(gymRepo, never()).findById(any());
    }

    @Test
    void getMe_returns_null_mainGym_when_id_dangling() {
        // mainGymId 가 set 됐지만 해당 gym 이 더 이상 존재하지 않으면 mainGym 은 null.
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        profile.updateMainGym(404L);
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(gymRepo.findById(404L)).thenReturn(Optional.empty());

        ProfileView view = service.getMe(1L);

        assertThat(view.mainGymId()).isEqualTo(404L);
        assertThat(view.mainGym()).isNull();
    }

    @Test
    void getMe_doesNotExposeAvatarUrl_whenStoredAvatarBelongsToAnotherUser() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        profile.updateAvatar(10L);
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(mediaAssetRepo.findById(10L)).thenReturn(Optional.of(readyAvatarImage(10L, 2L, "media/users/2/avatar/image/a.png")));

        ProfileView view = service.getMe(1L);

        assertThat(view.avatarMediaId()).isEqualTo(10L);
        assertThat(view.avatarUrl()).isNull();
    }

    @Test
    void updateMyProfile_avatarMediaId_requires_owned_ready_image_and_variant_for_url() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        MediaAsset avatar = readyAvatarImage(10L, 1L, "media/users/1/avatar/image/a.png");
        MediaImageVariant variant = mock(MediaImageVariant.class);
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(mediaAssetRepo.findById(10L)).thenReturn(Optional.of(avatar));
        when(variant.getPath()).thenReturn("media/users/1/avatar/image/a.webp");
        when(mediaImageVariantRepo.findFirstByMediaIdAndStatusAndPrimaryTrueOrderByIdDesc(10L, MediaStatus.READY))
                .thenReturn(Optional.of(variant));

        ProfileView view = service.updateMyProfile(
                1L,
                new UpdateProfileCommand(null, null, null, null, null, false, 10L));

        assertThat(view.avatarMediaId()).isEqualTo(10L);
        assertThat(view.avatarUrl()).isEqualTo("https://cdn.crimp.test/media/users/1/avatar/image/a.webp");
    }

    @Test
    void updateMyProfile_avatarMediaId_otherOwner_throws() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(mediaAssetRepo.findById(10L)).thenReturn(Optional.of(readyAvatarImage(10L, 2L, "media/users/2/avatar/image/a.png")));

        assertThatThrownBy(() -> service.updateMyProfile(
                1L,
                new UpdateProfileCommand(null, null, null, null, null, false, 10L)))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("AVATAR_MEDIA_FORBIDDEN"));
    }

    @Test
    void updateMyProfile_avatarMediaId_nonReadyImage_throws() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        MediaAsset uploading = MediaAsset.createUploading("01HAVATAR", 1L, MediaKind.IMAGE, "image/jpeg", "media/a.jpg");
        setField(uploading, "id", 10L);
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(mediaAssetRepo.findById(10L)).thenReturn(Optional.of(uploading));

        assertThatThrownBy(() -> service.updateMyProfile(
                1L,
                new UpdateProfileCommand(null, null, null, null, null, false, 10L)))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("AVATAR_MEDIA_INVALID"));
    }

    @Test
    void updateMyProfile_avatarMediaId_attemptUsage_throws() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(mediaAssetRepo.findById(10L)).thenReturn(Optional.of(readyImage(10L, 1L, "media/users/1/attempt/image/a.png")));

        assertThatThrownBy(() -> service.updateMyProfile(
                1L,
                new UpdateProfileCommand(null, null, null, null, null, false, 10L)))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("AVATAR_MEDIA_INVALID"));
    }

    @Test
    void updateMyProfile_clearAvatar_sets_null() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "kk");
        profile.updateAvatar(10L);
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        ProfileView view = service.updateMyProfile(
                1L,
                new UpdateProfileCommand(null, null, null, null, null, false, true, null));

        assertThat(view.avatarMediaId()).isNull();
        assertThat(view.avatarUrl()).isNull();
    }

    @Test
    void updateMyProfile_avatarMediaId_and_clearAvatar_both_set_throws_validation() {
        assertThatThrownBy(() -> service.updateMyProfile(
                1L,
                new UpdateProfileCommand(null, null, null, null, null, false, true, 10L)))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("INVALID_AVATAR_REQUEST"));
        verify(userRepo, never()).findById(any());
    }

    @Test
    void deleteMe_marksDeleted_andClearsRefreshTokens() {
        User user = user(1L, "01HDELETE__");
        setField(user, "emailHash", "hash");
        setField(user, "email", "a@b.com".getBytes());
        CrewJoinRequest request = CrewJoinRequest.builder()
                .extId("01JREQ")
                .crewId(55L)
                .userId(1L)
                .build();
        when(userRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(crewJoinRequestRepo.findAllByUserIdAndStatus(1L, CrewJoinRequestStatus.PENDING))
                .thenReturn(List.of(request));

        service.deleteMe(1L);

        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(user.isDeleted()).isTrue();
        assertThat(user.getEmail()).isNull();
        assertThat(user.getEmailHash()).isNull();
        assertThat(request.getStatus()).isEqualTo(CrewJoinRequestStatus.CANCELED);
        verify(refreshTokenStore).deleteAllForUser(1L);
    }

    @Test
    void deleteMe_marksActiveCrewMembershipsLeft_andDecrementsCrewCounts() {
        User user = user(1L, "01HDELETE__");
        CrewMember member = CrewMember.create(55L, 1L, CrewMemberRole.MEMBER, CrewMemberStatus.ACTIVE);
        Crew crew = crew(55L, "01JCREW", 12);
        when(userRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(crewJoinRequestRepo.findAllByUserIdAndStatus(1L, CrewJoinRequestStatus.PENDING))
                .thenReturn(List.of());
        when(crewMemberRepo.findCrewIdsByUserIdAndStatus(1L, CrewMemberStatus.ACTIVE))
                .thenReturn(List.of(55L));
        when(crewRepo.findAllByIdInForUpdate(List.of(55L))).thenReturn(List.of(crew));
        when(crewMemberRepo.findAllByUserIdAndStatus(1L, CrewMemberStatus.ACTIVE))
                .thenReturn(List.of(member));

        service.deleteMe(1L);

        assertThat(member.getStatus()).isEqualTo(CrewMemberStatus.LEFT);
        assertThat(crew.getMemberCount()).isEqualTo(11);
        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
    }

    @Test
    void deleteMe_rechecksActiveMembershipsAfterCrewLock_beforeDecrementingCounts() {
        User user = user(1L, "01HDELETE__");
        Crew crew = crew(55L, "01JCREW", 12);
        when(userRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(crewJoinRequestRepo.findAllByUserIdAndStatus(1L, CrewJoinRequestStatus.PENDING))
                .thenReturn(List.of());
        when(crewMemberRepo.findCrewIdsByUserIdAndStatus(1L, CrewMemberStatus.ACTIVE))
                .thenReturn(List.of(55L));
        when(crewRepo.findAllByIdInForUpdate(List.of(55L))).thenReturn(List.of(crew));
        when(crewMemberRepo.findAllByUserIdAndStatus(1L, CrewMemberStatus.ACTIVE))
                .thenReturn(List.of());

        service.deleteMe(1L);

        assertThat(crew.getMemberCount()).isEqualTo(12);
        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
    }

    @Test
    void deleteMe_softDeletesCrew_whenLeavingSoleOwnerMembership() {
        User user = user(1L, "01HDELETE__");
        CrewMember member = CrewMember.create(55L, 1L, CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE);
        Crew crew = crew(55L, "01JCREW", 12);
        when(userRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(crewJoinRequestRepo.findAllByUserIdAndStatus(1L, CrewJoinRequestStatus.PENDING))
                .thenReturn(List.of());
        when(crewMemberRepo.findCrewIdsByUserIdAndStatus(1L, CrewMemberStatus.ACTIVE))
                .thenReturn(List.of(55L));
        when(crewRepo.findAllByIdInForUpdate(List.of(55L))).thenReturn(List.of(crew));
        when(crewMemberRepo.findAllByUserIdAndStatus(1L, CrewMemberStatus.ACTIVE))
                .thenReturn(List.of(member));
        when(crewMemberRepo.countByCrewIdAndRoleAndStatus(55L, CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE))
                .thenReturn(1L);

        service.deleteMe(1L);

        assertThat(member.getStatus()).isEqualTo(CrewMemberStatus.LEFT);
        assertThat(crew.getMemberCount()).isEqualTo(11);
        assertThat(crew.isDeleted()).isTrue();
        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
    }

    @Test
    void deleteMe_releasesNickname_soOthersCanReuseIt() {
        User user = user(1L, "01HDELETE__");
        Profile profile = Profile.create(1L, "myNickname");
        profile.updateNickname("myNickname");
        when(userRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(crewJoinRequestRepo.findAllByUserIdAndStatus(1L, CrewJoinRequestStatus.PENDING))
                .thenReturn(List.of());
        when(crewMemberRepo.findCrewIdsByUserIdAndStatus(1L, CrewMemberStatus.ACTIVE))
                .thenReturn(List.of());

        service.deleteMe(1L);

        assertThat(profile.getNickname()).isEqualTo("deleted_1");
        assertThat(profile.isNicknameConfigured()).isFalse();
        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
    }

    @Test
    void deleteMe_alreadyDeleted_isIdempotent_andClearsRefreshTokens() {
        User user = user(1L, "01HDELETE__");
        user.deleteAccount();
        when(userRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(user));

        service.deleteMe(1L);

        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
        verify(refreshTokenStore).deleteAllForUser(1L);
    }

    // --- helpers ---

    private static User user(long id, String extId) {
        User u = User.create(extId, null, null);
        setField(u, "id", id);
        return u;
    }

    private static Crew crew(long id, String extId, int memberCount) {
        Crew crew = Crew.builder()
                .extId(extId)
                .ownerUserId(7L)
                .name("크루")
                .summary("요약")
                .description("설명")
                .region("서울")
                .levelBand(CrewLevelBand.ALL)
                .style(CrewStyle.BOULDERING)
                .memberCount(memberCount)
                .build();
        setField(crew, "id", id);
        return crew;
    }

    private static Gym gym(long id, String extId, String name, String brand) {
        Gym g = Gym.create(extId, name, "주소", new BigDecimal("37.5"), new BigDecimal("127.0"));
        setField(g, "id", id);
        if (brand != null) setField(g, "brand", brand);
        setField(g, "status", GymStatus.ACTIVE);
        return g;
    }

    private static MediaAsset readyImage(long id, long ownerUserId, String s3Key) {
        MediaAsset asset = MediaAsset.createUploading("01HMEDIA" + id, ownerUserId, MediaKind.IMAGE, "image/jpeg", s3Key);
        setField(asset, "id", id);
        asset.markReady();
        assertThat(asset.getStatus()).isEqualTo(MediaStatus.READY);
        return asset;
    }

    private static MediaAsset readyAvatarImage(long id, long ownerUserId, String s3Key) {
        MediaAsset asset = MediaAsset.createUploading(
                "01HMEDIA" + id,
                ownerUserId,
                MediaKind.IMAGE,
                MediaUsage.AVATAR,
                "image/jpeg",
                s3Key);
        setField(asset, "id", id);
        asset.markReady();
        assertThat(asset.getStatus()).isEqualTo(MediaStatus.READY);
        assertThat(asset.getUsage()).isEqualTo(MediaUsage.AVATAR);
        return asset;
    }

    private static AppProperties appProps() {
        return new AppProperties(
                "Crimp",
                "test",
                new AppProperties.Auth(900, 1209600, "crimp-test"),
                new AppProperties.Media("https://cdn.crimp.test", 600));
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Class<?> c = target.getClass();
            while (c != null) {
                try {
                    Field f = c.getDeclaredField(name);
                    f.setAccessible(true);
                    f.set(target, value);
                    return;
                } catch (NoSuchFieldException e) {
                    c = c.getSuperclass();
                }
            }
            throw new IllegalStateException("no field: " + name);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
