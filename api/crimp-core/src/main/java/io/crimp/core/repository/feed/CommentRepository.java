package io.crimp.core.repository.feed;

import io.crimp.core.entity.feed.Comment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    Optional<Comment> findByExtId(String extId);
    Slice<Comment> findByPostIdAndDeletedAtIsNullOrderByCreatedAt(Long postId, Pageable pageable);
}
