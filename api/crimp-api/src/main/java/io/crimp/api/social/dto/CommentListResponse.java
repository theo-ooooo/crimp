package io.crimp.api.social.dto;

import io.crimp.domain.social.CommentPage;

import java.util.List;

/**
 * 댓글 리스트 응답. {@code GlobalResponseWrapper} 가 추가로 envelope 으로 감싼다.
 */
public record CommentListResponse(List<CommentResponse> items, Page page) {

    public static CommentListResponse of(CommentPage page) {
        List<CommentResponse> items = page.items().stream()
                .map(CommentResponse::of)
                .toList();
        return new CommentListResponse(items, new Page(page.nextCursor(), page.size()));
    }

    public record Page(Long nextCursor, int size) {}
}
