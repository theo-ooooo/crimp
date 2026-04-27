package io.crimp.domain.social;

import java.util.List;

/**
 * 댓글 페이지 결과.
 *
 * @param items      현재 페이지 아이템 (정렬: Comment.id ASC, forward 페이지네이션)
 * @param nextCursor 다음 페이지 커서. hasNext 가 false 면 null
 * @param size       정규화된 요청 size (실제 반환 개수가 아님)
 */
public record CommentPage(
        List<CommentView> items,
        Long nextCursor,
        int size
) {}
