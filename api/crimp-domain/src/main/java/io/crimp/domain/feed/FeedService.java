package io.crimp.domain.feed;

import io.crimp.common.config.AppProperties;
import io.crimp.core.entity.enums.MediaKind;
import io.crimp.core.repository.feed.FeedMediaRow;
import io.crimp.core.repository.feed.FeedPostRepository;
import io.crimp.core.repository.feed.FeedQueryMode;
import io.crimp.core.repository.feed.FeedRow;
import io.crimp.core.repository.user.ProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 피드 도메인 서비스.
 *
 * <p>v2 스코프: {@code feed_posts} 루팅. 시도 기록 시(SEND/FLASH/ONSIGHT) 자동 게시되어
 * {@link io.crimp.core.entity.feed.FeedPost} 가 생성되며, 본 서비스는 이를 기반으로 read-only
 * 슬라이스를 합성한다. liked / likes / comments 는 모두 실제 데이터.
 *
 * <p>page size: null 또는 0 이하면 {@value #DEFAULT_PAGE_SIZE}, {@value #MAX_PAGE_SIZE}
 * 초과는 클램프.
 */
@Service
@Profile("!test")
public class FeedService {

    private static final Logger log = LoggerFactory.getLogger(FeedService.class);

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    /**
     * cdn-base-url 미설정 시 첫 호출에서 1회 warn 로그를 남기기 위한 가드. 요청마다 찍으면
     * 노이즈가 크고, 운영 사고 (env 누락) 가시성은 1회면 충분.
     */
    private final AtomicBoolean warnedNoCdnBase = new AtomicBoolean(false);

    /**
     * tagsJson 에서 {@code "hold"} 키 색상 값을 추출하는 정규식.
     *
     * <p>현 단계 tagsJson 스키마: {@code {"hold":"red"}} 또는 {@code {"hold":"red", ...}}.
     * 향후 스키마가 복잡해지면 ObjectMapper 로 교체. 지금은 의존성 추가 회피를 위해 regex 사용.
     */
    private static final Pattern HOLD_PATTERN =
            Pattern.compile("\"hold\"\\s*:\\s*\"([^\"]+)\"");

    // Spring Data JPA 가 custom fragment 를 별도 빈으로도 등록해 FeedPostRepositoryCustom
    // 타입 주입 시 모호성 발생 → composed repository (FeedPostRepository) 를 직접 주입.
    // FeedPostRepository extends JpaRepository, FeedPostRepositoryCustom 이라 메서드는 모두 사용 가능.
    private final FeedPostRepository feedRepository;
    private final ProfileRepository profileRepository;
    private final AppProperties appProperties;

    public FeedService(FeedPostRepository feedRepository,
                       ProfileRepository profileRepository,
                       AppProperties appProperties) {
        this.feedRepository = feedRepository;
        this.profileRepository = profileRepository;
        this.appProperties = appProperties;
    }

    @Transactional(readOnly = true)
    public FeedPage listFeed(long userId, FeedFilter filter, Long cursor, Integer size) {
        int pageSize = normalizeSize(size);
        FeedFilter effectiveFilter = filter == null ? FeedFilter.POPULAR : filter;

        // MY_GYM: 사용자의 mainGym 을 먼저 해석. 미설정이면 리포지토리 호출 없이 빈 페이지.
        Long gymIdFilter = null;
        if (effectiveFilter == FeedFilter.MY_GYM) {
            Optional<Long> mainGymId = profileRepository.findById(userId)
                    .map(io.crimp.core.entity.user.Profile::getMainGymId);
            if (mainGymId.isEmpty() || mainGymId.get() == null) {
                return new FeedPage(List.of(), null, pageSize);
            }
            gymIdFilter = mainGymId.get();
        }

        Slice<FeedRow> slice = feedRepository.findFeed(
                userId,
                toQueryMode(effectiveFilter),
                cursor,
                gymIdFilter,
                PageRequest.of(0, pageSize));

        // (PR-F2) 슬라이스 안 모든 post id 에 대해 post_media + media_assets 를 한 번에 batch fetch.
        // N+1 회피 — 페이지당 1쿼리 추가.
        List<Long> postIds = slice.getContent().stream().map(FeedRow::feedPostId).toList();
        List<FeedMediaRow> mediaRows = feedRepository.findFeedMediaForPosts(postIds);
        String cdnBaseUrl = appProperties.media().cdnBaseUrl();
        if ((cdnBaseUrl == null || cdnBaseUrl.isBlank())
                && !mediaRows.isEmpty()
                && warnedNoCdnBase.compareAndSet(false, true)) {
            // env 누락으로 응답에서 mediaUrls 가 모두 빈 배열로 떨어지는 사고가 무음으로
            // 진행되지 않도록 가시성 확보. 부팅 후 첫 호출에서 1회만 — 요청 단위 노이즈 차단.
            log.warn("[feed] app.media.cdn-base-url not configured — mediaUrls will be empty in responses");
        }
        Map<Long, List<FeedMediaItem>> mediaByPost = groupMedia(mediaRows, cdnBaseUrl);

        List<FeedItemView> items = slice.getContent().stream()
                .map(row -> toView(row, mediaByPost.getOrDefault(row.feedPostId(), List.of())))
                .toList();

        Long nextCursor = slice.hasNext() && !slice.getContent().isEmpty()
                ? slice.getContent().get(slice.getContent().size() - 1).feedPostId()
                : null;

        return new FeedPage(items, nextCursor, pageSize);
    }

    /**
     * post_media 행 리스트를 postId 별로 group + cdn-base-url + s3_key 합성. seq 순서는
     * 리포지토리 쿼리가 보장 (ORDER BY post_id, seq). LinkedHashMap 으로 입력 순서 유지.
     *
     * <p>{@code cdnBaseUrl} 이 null/공백이면 (env 미설정) 미디어를 응답에서 모두 제외 — 클라가
     * 깨진 이미지를 표시하지 않도록.
     */
    static Map<Long, List<FeedMediaItem>> groupMedia(List<FeedMediaRow> rows, String cdnBaseUrl) {
        Map<Long, List<FeedMediaItem>> grouped = new LinkedHashMap<>();
        if (cdnBaseUrl == null || cdnBaseUrl.isBlank()) {
            return grouped;
        }
        String base = cdnBaseUrl.endsWith("/")
                ? cdnBaseUrl.substring(0, cdnBaseUrl.length() - 1)
                : cdnBaseUrl;
        for (FeedMediaRow r : rows) {
            String url = base + "/" + r.s3Key();
            String thumb = null;
            if (r.kind() == MediaKind.VIDEO
                    && r.posterS3Key() != null
                    && !r.posterS3Key().isBlank()) {
                thumb = base + "/" + r.posterS3Key();
            }
            grouped
                    .computeIfAbsent(r.feedPostId(), k -> new ArrayList<>())
                    .add(new FeedMediaItem(r.kind(), url, thumb));
        }
        return grouped;
    }

    /**
     * userId 결정적 hue 계산: {@code (userId * 70 + 180) mod 360}.
     *
     * <p>userId 가 단조 증가해도 hue 가 충분히 흩어지도록 70(360 과 서로소) 곱셈을 사용.
     * 동일 userId 는 항상 동일 hue → 클라이언트 쪽 색상 캐시 가능.
     */
    static int avatarColorHue(long userId) {
        long hue = ((userId * 70L) + 180L) % 360L;
        if (hue < 0) hue += 360L; // userId 가 음수일 일은 없지만 방어
        return (int) hue;
    }

    /**
     * tagsJson 에서 hold 색상 추출. null/공백/매칭 실패 시 null.
     *
     * <p>잘못된 JSON 이라도 regex 매칭만 하므로 예외 없이 null 반환 — 피드 한 카드의 색상 누락은
     * 치명적이지 않다.
     */
    static String extractHoldColor(String tagsJson) {
        if (tagsJson == null || tagsJson.isBlank()) return null;
        Matcher m = HOLD_PATTERN.matcher(tagsJson);
        return m.find() ? m.group(1) : null;
    }

    private static int normalizeSize(Integer size) {
        if (size == null || size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private static FeedQueryMode toQueryMode(FeedFilter filter) {
        return switch (filter) {
            case POPULAR -> FeedQueryMode.POPULAR;
            case MY_GYM -> FeedQueryMode.MY_GYM;
            case FRIENDS -> FeedQueryMode.FRIENDS;
        };
    }

    private static FeedItemView toView(FeedRow row, List<FeedMediaItem> mediaUrls) {
        // FeedRow.userId 는 primitive long — INNER JOIN + NOT NULL PK 로 null 가능성 컴파일
        // 타임 제거. silent fallback (hue=180) 으로 회귀가 가려지는 위험 차단.
        // [PR #93, F5 PR-4 — 리뷰 B1] holdColor 1급 컬럼 우선, 미저장(legacy) 시 tagsJson 의
        // hold 키를 fallback 으로 추출해 hold 점 시각화 회귀 방지.
        String holdColor = row.holdColor() != null ? row.holdColor() : extractHoldColor(row.tagsJson());
        return new FeedItemView(
                row.feedPostExtId(),
                row.userExtId(),
                row.nickname(),
                avatarColorHue(row.userId()),
                row.gymName(),
                row.result(),
                row.gradeValue(),
                row.gradeNumeric(),
                holdColor,
                row.note(),
                row.likeCount(),
                row.commentCount(),
                row.liked(),
                row.loggedAt(),
                mediaUrls);
    }
}
