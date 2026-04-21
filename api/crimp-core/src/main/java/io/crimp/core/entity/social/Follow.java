package io.crimp.core.entity.social;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Getter
@Table(name = "follows")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Follow {

    @EmbeddedId
    private FollowId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    private Follow(FollowId id) {
        this.id = id;
    }

    public static Follow of(Long followerId, Long followeeId) {
        if (followerId.equals(followeeId)) {
            throw new IllegalArgumentException("Cannot follow self");
        }
        return new Follow(new FollowId(followerId, followeeId));
    }

    @Embeddable
    @Getter
    @EqualsAndHashCode
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class FollowId implements Serializable {
        @Column(name = "follower_id")
        private Long followerId;
        @Column(name = "followee_id")
        private Long followeeId;

        public FollowId(Long followerId, Long followeeId) {
            this.followerId = followerId;
            this.followeeId = followeeId;
        }
    }
}
