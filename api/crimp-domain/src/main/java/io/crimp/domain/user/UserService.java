package io.crimp.domain.user;

import io.crimp.core.entity.user.Profile;
import io.crimp.core.entity.user.User;
import io.crimp.core.repository.user.ProfileRepository;
import io.crimp.core.repository.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@org.springframework.context.annotation.Profile("!test")
public class UserService {

    private final UserRepository userRepo;
    private final ProfileRepository profileRepo;

    public UserService(UserRepository userRepo, ProfileRepository profileRepo) {
        this.userRepo = userRepo;
        this.profileRepo = profileRepo;
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
        if (cmd.mainGymId() != null) profile.updateMainGym(cmd.mainGymId());
        if (cmd.avatarMediaId() != null) profile.updateAvatar(cmd.avatarMediaId());

        return toView(user, profile);
    }

    private static ProfileView toView(User user, Profile profile) {
        return new ProfileView(
                user.getExtId(),
                profile.getNickname(),
                profile.getBio(),
                profile.getAvatarMediaId(),
                profile.getLevelSelf(),
                profile.getMainGymId()
        );
    }
}
