package io.crimp.api.feed.dto;

import io.crimp.domain.feed.FeedPage;

import java.util.List;

/**
 * 피드 리스트 응답.
 *
 * <p>{@code GlobalResponseWrapper} 가 한 번 더 래핑하므로 최종 와이어는
 * {@code {"status":true,"data":{"items":[...],"page":{...}}}} 형태.
 *
 * <p>{@code Page} 는 {@code SessionController.Page} / {@code GymController.Page} 와 동일
 * 형태이지만, 컨트롤러별 자체 record 를 두는 기존 패턴을 따른다.
 */
public record FeedListResponse(List<FeedItemResponse> items, Page page) {

    public static FeedListResponse of(FeedPage page) {
        List<FeedItemResponse> items = page.items().stream()
                .map(FeedItemResponse::of)
                .toList();
        return new FeedListResponse(items, new Page(page.nextCursor(), page.size()));
    }

    public record Page(Long nextCursor, int size) {}
}
