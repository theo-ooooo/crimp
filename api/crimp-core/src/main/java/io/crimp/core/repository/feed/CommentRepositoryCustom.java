package io.crimp.core.repository.feed;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

/**
 * 댓글 projection 쿼리.
 *
 * <p>Comment + User + Profile + (self-join Comment) 4-way 조인을 단일 read-only DTO 로
 * 평탄화한다. parent ext_id 까지 한 번에 가져와 N+1 회피.
 */
public interface CommentRepositoryCustom {

    /**
     * 게시물별 댓글 페이지(soft-deleted 제외).
     *
     * <p>정렬: {@code Comment.id ASC} — ULID 라 시간 단조성 보장. cursor 가 null 이면 처음부터,
     * 있으면 cursor 보다 큰 id 만 (forward 페이지네이션).
     *
     * @return Slice — pageSize+1 fetch 로 hasNext 추론
     */
    Slice<CommentRow> listByPost(long postId, Long cursor, Pageable pageable);
}
