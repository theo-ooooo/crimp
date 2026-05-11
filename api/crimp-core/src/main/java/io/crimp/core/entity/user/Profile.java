package io.crimp.core.entity.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "profiles")
@NoArgsConstructor(access = PROTECTED)
public class Profile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "nickname", nullable = false, length = 30, unique = true)
    private String nickname;

    @Column(name = "nickname_configured", nullable = false)
    private boolean nicknameConfigured;

    @Column(name = "bio", length = 300)
    private String bio;

    @Column(name = "avatar_media_id")
    private Long avatarMediaId;

    @Column(name = "level_self")
    private Byte levelSelf;

    @Column(name = "main_gym_id")
    private Long mainGymId;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    private Profile(Long userId, String nickname) {
        this.userId = userId;
        this.nickname = nickname;
        this.nicknameConfigured = false;
    }

    public static Profile create(Long userId, String nickname) {
        return new Profile(userId, nickname);
    }

    public void updateNickname(String nickname) {
        this.nickname = nickname;
        this.nicknameConfigured = true;
    }
    public void updateBio(String bio) { this.bio = bio; }
    public void updateAvatar(Long avatarMediaId) { this.avatarMediaId = avatarMediaId; }
    public void updateLevel(Byte levelSelf) { this.levelSelf = levelSelf; }
    public void updateMainGym(Long mainGymId) { this.mainGymId = mainGymId; }

    public void releaseNicknameOnDeletion() {
        this.nickname = "deleted_" + this.userId;
        this.nicknameConfigured = false;
    }
}
