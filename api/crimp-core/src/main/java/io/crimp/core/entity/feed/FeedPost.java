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

/**
 * 피드 게시물.
 *
 * <p>V904 의 {@code feed_posts} 테이블 매핑. 하나의 시도(SessionAttempt) 가 자동 게시될 때
 * {@code attemptId} 가 채워지며, 이 컬럼은 V908 에서 추가되었다 (UNIQUE + FK).
 * 사용자가 수동으로 작성하는 게시는 {@code attemptId=null} 로 동작.
 *
 * <p>visibility 는 V904 에서 TINYINT (1=PUBLIC / 2=FOLLOWERS / 3=PRIVATE) 로 저장되며,
 * {@link PostVisibility} enum 의 ordinal 매핑을 그대로 사용한다 ({@code PUBLIC.ordinal()=0}
 * 이 아닌 명시적 code() 매핑은 {@code CodeEnumConverter} 부재로 별도 도입하지 않고 enum
 * 순서가 1·2·3 매핑되도록 정의되어 있음 — {@link PostVisibility} 정의 참조).
 *
 * <p>like_count / comment_count 는 디노멀 카운터다. {@code insertable=false / updatable=false}
 * 로 선언해 JPA 가 직접 SET 하지 않게 하고, 대신 {@code FeedPostRepository} 의 직접 UPDATE
 * 쿼리로 race-safe 하게 증감한다 (좋아요·댓글 토글 시 read-modify-write 회피).
 */
@Entity
@Getter
@Table(name = "feed_posts")
@NoArgsConstructor(access = PROTECTED)
public class FeedPost extends SoftDeletableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, columnDefinition = "char(26)", unique = true, updatable = false)
    private String extId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "content", length = 2000)
    private String content;

    @Column(name = "session_id")
    private Long sessionId;

    /** V908 에서 추가된 시도 1:1 링크. 자유 글 게시는 null. */
    @Column(name = "attempt_id", unique = true)
    private Long attemptId;

    @Column(name = "gym_id")
    private Long gymId;

    @Column(name = "visibility", nullable = false)
    private PostVisibility visibility;

    @Column(name = "like_count", nullable = false, insertable = false, updatable = false)
    private Integer likeCount;

    @Column(name = "comment_count", nullable = false, insertable = false, updatable = false)
    private Integer commentCount;

    private FeedPost(String extId, Long userId, String content, Long sessionId, Long attemptId,
                     Long gymId, PostVisibility visibility) {
        this.extId = extId;
        this.userId = userId;
        this.content = content;
        this.sessionId = sessionId;
        this.attemptId = attemptId;
        this.gymId = gymId;
        this.visibility = visibility;
    }

    /** 자유 글 — attempt 비종속 게시. */
    public static FeedPost create(String extId, Long userId, String content, Long sessionId,
                                  Long gymId, PostVisibility visibility) {
        return new FeedPost(extId, userId, content, sessionId, null, gymId, visibility);
    }

    /** 시도 자동 게시 — {@code attemptId} 1:1 링크. */
    public static FeedPost fromAttempt(String extId, Long userId, String content, Long sessionId,
                                       Long attemptId, Long gymId, PostVisibility visibility) {
        return new FeedPost(extId, userId, content, sessionId, attemptId, gymId, visibility);
    }

    public void updateContent(String content) { this.content = content; }
    public void updateVisibility(PostVisibility visibility) { this.visibility = visibility; }
}
