package io.crimp.core.entity.feed;

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
@Table(name = "likes")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostLike {

    @EmbeddedId
    private PostLikeId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    private PostLike(PostLikeId id) {
        this.id = id;
    }

    public static PostLike of(Long userId, Long postId) {
        return new PostLike(new PostLikeId(userId, postId));
    }

    @Embeddable
    @Getter
    @EqualsAndHashCode
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class PostLikeId implements Serializable {
        @Column(name = "user_id")
        private Long userId;
        @Column(name = "post_id")
        private Long postId;

        public PostLikeId(Long userId, Long postId) {
            this.userId = userId;
            this.postId = postId;
        }
    }
}
