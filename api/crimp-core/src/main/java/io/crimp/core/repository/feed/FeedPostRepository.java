package io.crimp.core.repository.feed;

import io.crimp.core.entity.feed.FeedPost;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * FeedPost JPA 리포지토리.
 *
 * <p>커스텀 쿼리({@link FeedPostRepositoryCustom}) 와 결합해 피드 슬라이스를 노출.
 * 좋아요/댓글 카운터는 race-safe 하게 직접 UPDATE — read-modify-write 회피.
 */
public interface FeedPostRepository extends JpaRepository<FeedPost, Long>, FeedPostRepositoryCustom {

    Optional<FeedPost> findByExtId(String extId);

    Optional<FeedPost> findByAttemptId(long attemptId);

    Slice<FeedPost> findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * 좋아요 카운터 증가. INSERT IGNORE 로 멱등 보장된 likes 삽입 후에만 호출되어야 race-safe.
     *
     * @return 영향 받은 row 수 (정상 1, post 미존재/삭제 시 0)
     */
    @Modifying
    @Query("UPDATE FeedPost fp SET fp.likeCount = fp.likeCount + 1 " +
            "WHERE fp.id = :postId AND fp.deletedAt IS NULL")
    int incrementLikeCount(@Param("postId") long postId);

    /**
     * 좋아요 카운터 감소. {@code GREATEST(like_count - 1, 0)} 로 0 이하 진입 차단.
     *
     * @return 영향 받은 row 수 (정상 1, post 미존재 시 0)
     */
    @Modifying
    @Query(value = "UPDATE feed_posts SET like_count = GREATEST(like_count - 1, 0) " +
            "WHERE id = :postId", nativeQuery = true)
    int decrementLikeCount(@Param("postId") long postId);

    /** 댓글 카운터 증가. */
    @Modifying
    @Query("UPDATE FeedPost fp SET fp.commentCount = fp.commentCount + 1 " +
            "WHERE fp.id = :postId AND fp.deletedAt IS NULL")
    int incrementCommentCount(@Param("postId") long postId);

    /** 댓글 카운터 감소. 0 이하 방지. */
    @Modifying
    @Query(value = "UPDATE feed_posts SET comment_count = GREATEST(comment_count - 1, 0) " +
            "WHERE id = :postId", nativeQuery = true)
    int decrementCommentCount(@Param("postId") long postId);

    /** 카운터 직접 조회 — 직접 UPDATE 후 stale 영속 컨텍스트 우회. */
    @Query("SELECT fp.likeCount FROM FeedPost fp WHERE fp.id = :postId")
    Integer findLikeCount(@Param("postId") long postId);

    @Query("SELECT fp.commentCount FROM FeedPost fp WHERE fp.id = :postId")
    Integer findCommentCount(@Param("postId") long postId);
}
