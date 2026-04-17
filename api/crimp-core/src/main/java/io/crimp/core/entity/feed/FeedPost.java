package io.crimp.core.entity.feed;

import io.crimp.core.base.SoftDeletableEntity;
import io.crimp.core.entity.enums.PostVisibility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "feed_posts")
@NoArgsConstructor(access = PROTECTED)
public class FeedPost extends SoftDeletableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, length = 26, unique = true, updatable = false)
    private String extId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "content", length = 2000)
    private String content;

    @Column(name = "session_id")
    private Long sessionId;

    @Column(name = "gym_id")
    private Long gymId;

    @Column(name = "visibility", nullable = false)
    private PostVisibility visibility;

    @Column(name = "like_count", nullable = false, insertable = false, updatable = false)
    private Long likeCount;

    @Column(name = "comment_count", nullable = false, insertable = false, updatable = false)
    private Long commentCount;

    private FeedPost(String extId, Long userId, String content, Long sessionId, Long gymId, PostVisibility visibility) {
        this.extId = extId;
        this.userId = userId;
        this.content = content;
        this.sessionId = sessionId;
        this.gymId = gymId;
        this.visibility = visibility;
    }

    public static FeedPost create(String extId, Long userId, String content, Long sessionId, Long gymId, PostVisibility visibility) {
        return new FeedPost(extId, userId, content, sessionId, gymId, visibility);
    }

    public void updateContent(String content) { this.content = content; }
    public void updateVisibility(PostVisibility visibility) { this.visibility = visibility; }
}
