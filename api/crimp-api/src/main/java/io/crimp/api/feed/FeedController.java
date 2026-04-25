package io.crimp.api.feed;

import io.crimp.api.feed.dto.FeedListResponse;
import io.crimp.api.security.CrimpPrincipal;
import io.crimp.domain.feed.FeedFilter;
import io.crimp.domain.feed.FeedPage;
import io.crimp.domain.feed.FeedService;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 피드 화면 API.
 *
 * <p>GET {@code /api/v1/feed} — 등반 시도 기반 read-only 피드. 좋아요·댓글 도메인 도입 전까지
 * SessionAttempt 를 view-projection 으로 노출한다.
 *
 * <p>인증: {@link CrimpPrincipal} 필수 (SecurityConfig 의 anyRequest().authenticated 적용).
 */
@RestController
@RequestMapping("/api/v1")
@Profile("!test")
public class FeedController {

    private final FeedService feedService;

    public FeedController(FeedService feedService) {
        this.feedService = feedService;
    }

    /**
     * 피드 목록.
     *
     * @param filter "popular"(기본) / "my-gym" / "friends". 인식 불가 값은 popular 로 폴백.
     * @param cursor 이전 페이지 마지막 attempt.id (없으면 첫 페이지)
     * @param size   페이지 크기 (default 20, max 50)
     */
    @GetMapping("/feed")
    public FeedListResponse list(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @RequestParam(required = false) String filter,
            @RequestParam(required = false) Long cursor,
            @RequestParam(required = false) Integer size) {
        FeedPage page = feedService.listFeed(
                principal.userId(),
                FeedFilter.fromQuery(filter),
                cursor,
                size);
        return FeedListResponse.of(page);
    }
}
