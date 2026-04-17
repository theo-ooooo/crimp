package io.crimp.core.repository.feed;

import io.crimp.core.entity.feed.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostLikeRepository extends JpaRepository<PostLike, PostLike.PostLikeId> {
    long countByIdPostId(Long postId);
    boolean existsByIdUserIdAndIdPostId(Long userId, Long postId);
}
