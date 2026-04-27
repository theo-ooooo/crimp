package io.crimp.domain.user;

import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.user.Profile;
import io.crimp.core.entity.user.User;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.user.ProfileRepository;
import io.crimp.core.repository.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@org.springframework.context.annotation.Profile("!test")
public class UserService {

    private final UserRepository userRepo;
    private final ProfileRepository profileRepo;
    private final GymRepository gymRepo;

    public UserService(UserRepository userRepo, ProfileRepository profileRepo, GymRepository gymRepo) {
        this.userRepo = userRepo;
        this.profileRepo = profileRepo;
        this.gymRepo = gymRepo;
    }

    @Transactional(readOnly = true)
    public ProfileView getMe(long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new UserException("USER_NOT_FOUND", "User " + userId + " not found"));
        var profile = profileRepo.findById(userId)
                .orElseThrow(() -> new UserException("PROFILE_MISSING", "Profile for user " + userId + " missing"));
        return toView(user, profile);
    }

    @Transactional(readOnly = true)
    public ProfileView getPublicProfile(String extId) {
        User user = userRepo.findByExtId(extId)
                .orElseThrow(() -> new UserException("USER_NOT_FOUND", "User " + extId + " not found"));
        var profile = profileRepo.findById(user.getId())
                .orElseThrow(() -> new UserException("PROFILE_MISSING", "Profile missing for " + extId));
        return toView(user, profile);
    }

    @Transactional
    public ProfileView updateMyProfile(long userId, UpdateProfileCommand cmd) {
        // 주 암장 관련 입력 사전 검증: 명시 해제와 신규 지정은 상호 배타.
        validateMainGymInput(cmd);

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new UserException("USER_NOT_FOUND", "User " + userId + " not found"));
        var profile = profileRepo.findById(userId)
                .orElseThrow(() -> new UserException("PROFILE_MISSING", "Profile for user " + userId + " missing"));

        if (cmd.nickname() != null) {
            if (!cmd.nickname().equals(profile.getNickname())
                    && profileRepo.existsByNickname(cmd.nickname())) {
                throw new UserException("NICKNAME_TAKEN", "Nickname already taken: " + cmd.nickname());
            }
            profile.updateNickname(cmd.nickname());
        }
        if (cmd.bio() != null) profile.updateBio(cmd.bio());
        if (cmd.levelSelf() != null) profile.updateLevel(cmd.levelSelf());

        // 주 암장 변경 적용. (1) clearMainGym=true 면 null 로 명시 해제,
        // (2) mainGymExtId 가 있으면 ULID → numeric id 로 해석,
        // (3) mainGymId 만 있으면 호환 모드로 그대로 사용.
        if (cmd.clearMainGym()) {
            profile.updateMainGym(null);
        } else if (cmd.mainGymExtId() != null) {
            Gym gym = gymRepo.findByExtId(cmd.mainGymExtId())
                    .orElseThrow(() -> new UserException(
                            "MAIN_GYM_NOT_FOUND",
                            "Gym not found: " + cmd.mainGymExtId()));
            profile.updateMainGym(gym.getId());
        } else if (cmd.mainGymId() != null) {
            profile.updateMainGym(cmd.mainGymId());
        }

        if (cmd.avatarMediaId() != null) profile.updateAvatar(cmd.avatarMediaId());

        return toView(user, profile);
    }

    /**
     * 주 암장 입력 상호 배타 검증.
     * clearMainGym=true 와 (mainGymExtId | mainGymId) 동시 set 은 의도가 모호하므로 거부.
     */
    private static void validateMainGymInput(UpdateProfileCommand cmd) {
        if (cmd.clearMainGym() && (cmd.mainGymExtId() != null || cmd.mainGymId() != null)) {
            throw new UserException(
                    "INVALID_MAIN_GYM_REQUEST",
                    "clearMainGym cannot be combined with mainGymExtId or mainGymId");
        }
    }

    private ProfileView toView(User user, Profile profile) {
        ProfileView.MainGymView mainGym = resolveMainGym(profile.getMainGymId());
        return new ProfileView(
                user.getExtId(),
                profile.getNickname(),
                profile.getBio(),
                profile.getAvatarMediaId(),
                profile.getLevelSelf(),
                profile.getMainGymId(),
                mainGym
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
}
