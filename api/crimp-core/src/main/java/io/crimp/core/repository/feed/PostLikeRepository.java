package io.crimp.core.repository.feed;

import io.crimp.core.entity.feed.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 좋아요 JPA 리포지토리.
 *
 * <p>composite PK + 멱등 INSERT/DELETE 만 노출. 카운터는 {@link FeedPostRepository} 에서 별도
 * UPDATE 로 갱신해 read-modify-write 레이스를 회피한다.
 */
public interface PostLikeRepository extends JpaRepository<PostLike, PostLike.PostLikeId> {

    boolean existsByIdUserIdAndIdPostId(Long userId, Long postId);

    /**
     * 멱등 INSERT — 이미 존재하면 0 반환. 동시 두 번 호출되어도 좋아요 카운트가 두 번 오르지
     * 않도록 도메인 서비스는 본 쿼리의 반환값을 보고 카운터 증감을 결정한다.
     *
     * @return 새로 삽입된 row 수 (1=신규 좋아요, 0=이미 존재)
     */
    @Modifying
    @Query(value = "INSERT IGNORE INTO likes (user_id, post_id, created_at) " +
            "VALUES (:userId, :postId, CURRENT_TIMESTAMP)", nativeQuery = true)
    int insertIgnore(@Param("userId") long userId, @Param("postId") long postId);

    /**
     * DELETE — 존재하지 않으면 0. 카운터 감소도 본 반환값에 따라 결정.
     */
    @Modifying
    @Query(value = "DELETE FROM likes WHERE user_id = :userId AND post_id = :postId",
            nativeQuery = true)
    int deleteByUserAndPost(@Param("userId") long userId, @Param("postId") long postId);
}
