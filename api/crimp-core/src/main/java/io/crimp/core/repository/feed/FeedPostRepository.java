package io.crimp.core.repository.feed;

import io.crimp.core.entity.feed.FeedPost;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FeedPostRepository extends JpaRepository<FeedPost, Long> {
    Optional<FeedPost> findByExtId(String extId);
    Slice<FeedPost> findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
