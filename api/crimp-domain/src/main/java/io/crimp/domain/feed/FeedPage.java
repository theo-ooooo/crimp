package io.crimp.domain.feed;

import java.util.List;

/**
 * 피드 페이지 결과.
 *
 * @param items      현재 페이지 아이템 (정렬: SessionAttempt.id DESC)
 * @param nextCursor 다음 페이지 커서. hasNext 가 false 면 null
 * @param size       정규화된 요청 size (실제 반환 개수가 아님)
 */
public record FeedPage(
        List<FeedItemView> items,
        Long nextCursor,
        int size
) {}
