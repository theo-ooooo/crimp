package io.crimp.domain.feed;

import io.crimp.core.repository.feed.FeedQueryMode;
import io.crimp.core.repository.feed.FeedRepositoryCustom;
import io.crimp.core.repository.feed.FeedRow;
import io.crimp.core.repository.user.ProfileRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 피드 도메인 서비스.
 *
 * <p>v1 스코프: SessionAttempt 위 view-projection 만 합성. 별도 FeedPost / Like / Comment
 * 도메인은 후속 PR. 좋아요·댓글 카운트는 placeholder {@code 0L}.
 *
 * <p>page size: null 또는 0 이하면 {@value #DEFAULT_PAGE_SIZE}, {@value #MAX_PAGE_SIZE}
 * 초과는 클램프.
 */
@Service
@Profile("!test")
public class FeedService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    /**
     * tagsJson 에서 {@code "hold"} 키 색상 값을 추출하는 정규식.
     *
     * <p>현 단계 tagsJson 스키마: {@code {"hold":"red"}} 또는 {@code {"hold":"red", ...}}.
     * 향후 스키마가 복잡해지면 ObjectMapper 로 교체. 지금은 의존성 추가 회피를 위해 regex 사용.
     */
    private static final Pattern HOLD_PATTERN =
            Pattern.compile("\"hold\"\\s*:\\s*\"([^\"]+)\"");

    private final FeedRepositoryCustom feedRepository;
    private final ProfileRepository profileRepository;

    public FeedService(FeedRepositoryCustom feedRepository, ProfileRepository profileRepository) {
        this.feedRepository = feedRepository;
        this.profileRepository = profileRepository;
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

        List<FeedItemView> items = slice.getContent().stream()
                .map(FeedService::toView)
                .toList();

        Long nextCursor = slice.hasNext() && !slice.getContent().isEmpty()
                ? slice.getContent().get(slice.getContent().size() - 1).attemptId()
                : null;

        return new FeedPage(items, nextCursor, pageSize);
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

    private static FeedItemView toView(FeedRow row) {
        // FeedRow.userId 는 primitive long — INNER JOIN + NOT NULL PK 로 null 가능성 컴파일
        // 타임 제거. silent fallback (hue=180) 으로 회귀가 가려지는 위험 차단.
        return new FeedItemView(
                row.attemptExtId(),
                row.userExtId(),
                row.nickname(),
                avatarColorHue(row.userId()),
                row.gymName(),
                row.result(),
                row.gradeValue(),
                row.gradeNumeric(),
                extractHoldColor(row.tagsJson()),
                row.note(),
                0L,
                0L,
                row.loggedAt());
    }
}
