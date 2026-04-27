package io.crimp.core.repository.feed;

import io.crimp.core.entity.feed.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 댓글 JPA 리포지토리.
 *
 * <p>커서 기반 페이지네이션은 {@link CommentRepositoryCustom} 의 projection 쿼리를 사용한다.
 */
public interface CommentRepository extends JpaRepository<Comment, Long>, CommentRepositoryCustom {

    Optional<Comment> findByExtId(String extId);
}
