package io.crimp.domain.user;

import io.crimp.common.config.AppProperties;
import io.crimp.core.entity.enums.MediaKind;
import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.core.entity.enums.MediaUsage;
import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.enums.UserStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.media.MediaAsset;
import io.crimp.core.entity.user.Profile;
import io.crimp.core.entity.user.User;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.media.MediaAssetRepository;
import io.crimp.core.repository.user.ProfileRepository;
import io.crimp.core.repository.user.UserRepository;
import io.crimp.domain.auth.RefreshTokenStore;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@org.springframework.context.annotation.Profile("!test")
public class UserService {

    private final UserRepository userRepo;
    private final ProfileRepository profileRepo;
    private final GymRepository gymRepo;
    private final RefreshTokenStore refreshTokenStore;
    private final MediaAssetRepository mediaAssetRepo;
    private final AppProperties appProperties;

    public UserService(
            UserRepository userRepo,
            ProfileRepository profileRepo,
            GymRepository gymRepo,
            RefreshTokenStore refreshTokenStore,
            MediaAssetRepository mediaAssetRepo,
            AppProperties appProperties) {
        this.userRepo = userRepo;
        this.profileRepo = profileRepo;
        this.gymRepo = gymRepo;
        this.refreshTokenStore = refreshTokenStore;
        this.mediaAssetRepo = mediaAssetRepo;
        this.appProperties = appProperties;
    }

    @Transactional(readOnly = true)
    public ProfileView getMe(long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new UserException("USER_NOT_FOUND", "User " + userId + " not found"));
        requireActive(user);
        var profile = profileRepo.findById(userId)
                .orElseThrow(() -> new UserException("PROFILE_MISSING", "Profile for user " + userId + " missing"));
        return toView(user, profile);
    }

    @Transactional(readOnly = true)
    public ProfileView getPublicProfile(String extId) {
        User user = userRepo.findByExtId(extId)
                .orElseThrow(() -> new UserException("USER_NOT_FOUND", "User " + extId + " not found"));
        requireActive(user);
        var profile = profileRepo.findById(user.getId())
                .orElseThrow(() -> new UserException("PROFILE_MISSING", "Profile missing for " + extId));
        // I4: PublicUserResponse 는 mainGym 정보를 노출하지 않으므로 resolve 호출은 낭비.
        // toViewWithoutMainGym 으로 gym 조회를 생략한다.
        return toViewWithoutMainGym(user, profile);
    }

    @Transactional
    public ProfileView updateMyProfile(long userId, UpdateProfileCommand cmd) {
        // 주 암장 관련 입력 사전 검증: 명시 해제와 신규 지정은 상호 배타.
        validateMainGymInput(cmd);
        validateAvatarInput(cmd);

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new UserException("USER_NOT_FOUND", "User " + userId + " not found"));
        requireActive(user);
        var profile = profileRepo.findById(userId)
                .orElseThrow(() -> new UserException("PROFILE_MISSING", "Profile for user " + userId + " missing"));

        if (cmd.nickname() != null) {
            String trimmed = cmd.nickname().trim();
            if (trimmed.length() < 2 || trimmed.length() > 30) {
                throw new UserException("INVALID_NICKNAME", "Nickname must be 2-30 characters after trim");
            }
            if (!trimmed.equals(profile.getNickname())
                    && profileRepo.existsByNickname(trimmed)) {
                throw new UserException("NICKNAME_TAKEN", "Nickname already taken: " + trimmed);
            }
            profile.updateNickname(trimmed);
        }
        if (cmd.bio() != null) profile.updateBio(cmd.bio());
        if (cmd.levelSelf() != null) profile.updateLevel(cmd.levelSelf());

        // 주 암장 변경 적용. (1) clearMainGym=true 면 null 로 명시 해제,
        // (2) mainGymExtId 가 있으면 ULID → numeric id 로 해석,
        // (3) mainGymId 만 있으면 호환 모드로 그대로 사용.
        if (cmd.clearMainGym()) {
            profile.updateMainGym(null);
        } else if (cmd.mainGymExtId() != null) {
            // I3: 활성 상태 (ACTIVE) 의 암장만 mainGym 으로 설정 가능. CLOSED/PENDING 은 거부.
            Gym gym = gymRepo.findByExtId(cmd.mainGymExtId())
                    .filter(g -> g.getStatus() == GymStatus.ACTIVE)
                    .orElseThrow(() -> new UserException(
                            "MAIN_GYM_NOT_FOUND",
                            "Gym not found or inactive: " + cmd.mainGymExtId()));
            profile.updateMainGym(gym.getId());
        } else if (cmd.mainGymId() != null) {
            profile.updateMainGym(cmd.mainGymId());
        }

        if (cmd.clearAvatar()) {
            profile.updateAvatar(null);
        } else if (cmd.avatarMediaId() != null) {
            validateAvatarMedia(userId, cmd.avatarMediaId());
            profile.updateAvatar(cmd.avatarMediaId());
        }

        return toView(user, profile);
    }

    @Transactional
    public void deleteMe(long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new UserException("USER_NOT_FOUND", "User " + userId + " not found"));
        if (user.getStatus() == UserStatus.DELETED || user.isDeleted()) {
            refreshTokenStore.deleteAllForUser(userId);
            return;
        }
        user.deleteAccount();
        refreshTokenStore.deleteAllForUser(userId);
    }

    private static void requireActive(User user) {
        if (user.getStatus() == UserStatus.DELETED || user.isDeleted()) {
            throw new UserException("USER_NOT_FOUND", "User " + user.getId() + " not found");
        }
    }

    /**
     * 주 암장 입력 상호 배타 검증.
     *
     * <ul>
     *   <li>clearMainGym=true 와 (mainGymExtId | mainGymId) 동시 set — 의도 모호</li>
     *   <li>mainGymExtId 와 mainGymId 동시 set — 우선순위 모호 (둘 다 set 했는데 한쪽이 silently
     *       이긴다면 다른 쪽이 무시됐다는 신호를 클라이언트가 받지 못함)</li>
     * </ul>
     * 위 조합은 모두 INVALID_MAIN_GYM_REQUEST (400) 로 거부한다.
     */
    private static void validateMainGymInput(UpdateProfileCommand cmd) {
        if (cmd.clearMainGym() && (cmd.mainGymExtId() != null || cmd.mainGymId() != null)) {
            throw new UserException(
                    "INVALID_MAIN_GYM_REQUEST",
                    "clearMainGym cannot be combined with mainGymExtId or mainGymId");
        }
        if (cmd.mainGymExtId() != null && cmd.mainGymId() != null) {
            throw new UserException(
                    "INVALID_MAIN_GYM_REQUEST",
                    "mainGymExtId and mainGymId cannot both be provided");
        }
    }

    private static void validateAvatarInput(UpdateProfileCommand cmd) {
        if (cmd.clearAvatar() && cmd.avatarMediaId() != null) {
            throw new UserException(
                    "INVALID_AVATAR_REQUEST",
                    "clearAvatar cannot be combined with avatarMediaId");
        }
    }

    private void validateAvatarMedia(long userId, long avatarMediaId) {
        MediaAsset asset = mediaAssetRepo.findById(avatarMediaId)
                .orElseThrow(() -> new UserException("AVATAR_MEDIA_NOT_FOUND", "Avatar media not found: " + avatarMediaId));
        if (!asset.getOwnerUserId().equals(userId)) {
            throw new UserException("AVATAR_MEDIA_FORBIDDEN", "Avatar media belongs to another user: " + avatarMediaId);
        }
        if (asset.getKind() != MediaKind.IMAGE
                || asset.getStatus() != MediaStatus.READY
                || asset.getUsage() != MediaUsage.AVATAR) {
            throw new UserException("AVATAR_MEDIA_INVALID", "Avatar media must be a READY AVATAR IMAGE: " + avatarMediaId);
        }
    }

    private ProfileView toView(User user, Profile profile) {
        ProfileView.MainGymView mainGym = resolveMainGym(profile.getMainGymId());
        MediaAsset avatar = resolveAvatar(profile.getAvatarMediaId(), user.getId());
        return new ProfileView(
                user.getExtId(),
                profile.getNickname(),
                profile.isNicknameConfigured(),
                profile.getBio(),
                profile.getAvatarMediaId(),
                resolveAvatarUrl(avatar),
                profile.getLevelSelf(),
                profile.getMainGymId(),
                mainGym
        );
    }

    /**
     * 공개 프로필용 변환 — mainGym 정보를 항상 null 로 둔다 (PublicUserResponse 미노출).
     */
    private ProfileView toViewWithoutMainGym(User user, Profile profile) {
        MediaAsset avatar = resolveAvatar(profile.getAvatarMediaId(), user.getId());
        return new ProfileView(
                user.getExtId(),
                profile.getNickname(),
                profile.isNicknameConfigured(),
                profile.getBio(),
                profile.getAvatarMediaId(),
                resolveAvatarUrl(avatar),
                profile.getLevelSelf(),
                profile.getMainGymId(),
                null
        );
    }

    /**
     * mainGymId 로 암장 정보를 조회해 클라이언트 렌더용 lightweight 뷰로 변환.
     * id 가 null 이거나 더 이상 존재하지 않는 암장이면 null 반환 (응답에서는 자동 누락).
     */
    private ProfileView.MainGymView resolveMainGym(Long mainGymId) {
        if (mainGymId == null) return null;
        return gymRepo.findById(mainGymId)
                .map(g -> new ProfileView.MainGymView(g.getExtId(), g.getName(), g.getBrand()))
                .orElse(null);
    }

    private MediaAsset resolveAvatar(Long avatarMediaId, Long ownerUserId) {
        if (avatarMediaId == null) return null;
        return mediaAssetRepo.findById(avatarMediaId)
                .filter(a -> a.getOwnerUserId().equals(ownerUserId))
                .filter(a -> a.getKind() == MediaKind.IMAGE)
                .filter(a -> a.getStatus() == MediaStatus.READY)
                .filter(a -> a.getUsage() == MediaUsage.AVATAR)
                .orElse(null);
    }

    private String resolveAvatarUrl(MediaAsset avatar) {
        if (avatar == null) return null;
        String cdnBaseUrl = appProperties.media().cdnBaseUrl();
        if (cdnBaseUrl == null || cdnBaseUrl.isBlank()) return null;
        return joinUrl(cdnBaseUrl, avatar.getS3Key());
    }

    private static String joinUrl(String baseUrl, String s3Key) {
        String base = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String key = s3Key.startsWith("/") ? s3Key.substring(1) : s3Key;
        return base + "/" + key;
    }
}
