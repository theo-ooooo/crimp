package io.crimp.domain.feed;

import io.crimp.common.config.AppProperties;
import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.entity.enums.MediaKind;
import io.crimp.core.entity.user.Profile;
import io.crimp.core.repository.feed.FeedMediaRow;
import io.crimp.core.repository.feed.FeedPostRepository;
import io.crimp.core.repository.feed.FeedQueryMode;
import io.crimp.core.repository.feed.FeedRow;
import io.crimp.core.repository.user.ProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeedServiceTest {

    private static final String TEST_CDN_BASE = "https://cdn.test";

    private FeedPostRepository feedRepository;
    private ProfileRepository profileRepository;
    private FeedService service;

    @BeforeEach
    void setUp() {
        feedRepository = mock(FeedPostRepository.class);
        profileRepository = mock(ProfileRepository.class);
        service = new FeedService(feedRepository, profileRepository, appPropsWithCdn(TEST_CDN_BASE));
    }

    private static AppProperties appPropsWithCdn(String cdnBaseUrl) {
        return new AppProperties(
                "crimp",
                "test",
                new AppProperties.Auth(900L, 1209600L, "crimp"),
                new AppProperties.Media(cdnBaseUrl, 600L));
    }

    // --- size 정규화 ---

    @Test
    void size_null_defaults_to_20() {
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(empty(20));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);

        assertThat(page.size()).isEqualTo(20);
        ArgumentCaptor<Pageable> pageableCap = ArgumentCaptor.forClass(Pageable.class);
        verify(feedRepository).findFeed(eq(1L), eq(FeedQueryMode.POPULAR), eq(null), eq(null), pageableCap.capture());
        assertThat(pageableCap.getValue().getPageSize()).isEqualTo(20);
    }

    @Test
    void size_over_50_is_clamped_to_50() {
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(empty(50));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, 1000);

        assertThat(page.size()).isEqualTo(50);
        ArgumentCaptor<Pageable> pageableCap = ArgumentCaptor.forClass(Pageable.class);
        verify(feedRepository).findFeed(anyLong(), any(), any(), any(), pageableCap.capture());
        assertThat(pageableCap.getValue().getPageSize()).isEqualTo(50);
    }

    @Test
    void size_zero_or_negative_defaults_to_20() {
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(empty(20));

        assertThat(service.listFeed(1L, FeedFilter.POPULAR, null, 0).size()).isEqualTo(20);
        assertThat(service.listFeed(1L, FeedFilter.POPULAR, null, -5).size()).isEqualTo(20);
    }

    // --- MY_GYM 분기 ---

    @Test
    void my_gym_with_no_main_gym_returns_empty_and_skips_repo() {
        // mainGym 미설정 → DB 라운드트립 회피 (서비스 단에서 short-circuit)
        Profile profile = Profile.create(42L, "user42");
        // mainGymId 는 null 상태
        when(profileRepository.findById(42L)).thenReturn(Optional.of(profile));

        FeedPage page = service.listFeed(42L, FeedFilter.MY_GYM, null, null);

        assertThat(page.items()).isEmpty();
        assertThat(page.nextCursor()).isNull();
        assertThat(page.size()).isEqualTo(20);
        verify(feedRepository, never()).findFeed(anyLong(), any(), any(), any(), any());
    }

    @Test
    void my_gym_with_no_profile_returns_empty_and_skips_repo() {
        // 프로필 자체가 없는 경우(가입 직후 엣지)도 동일하게 빈 페이지
        when(profileRepository.findById(42L)).thenReturn(Optional.empty());

        FeedPage page = service.listFeed(42L, FeedFilter.MY_GYM, null, null);

        assertThat(page.items()).isEmpty();
        verify(feedRepository, never()).findFeed(anyLong(), any(), any(), any(), any());
    }

    @Test
    void my_gym_with_main_gym_calls_repo_with_resolved_gym_id() {
        Profile profile = Profile.create(42L, "user42");
        profile.updateMainGym(99L);
        when(profileRepository.findById(42L)).thenReturn(Optional.of(profile));
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(empty(20));

        service.listFeed(42L, FeedFilter.MY_GYM, null, null);

        verify(feedRepository).findFeed(eq(42L), eq(FeedQueryMode.MY_GYM), eq(null), eq(99L), any());
    }

    // --- tagsJson → holdColor 파싱 ---

    @Test
    void hold_color_parsed_from_tagsJson() {
        FeedRow row = baseRow().withTagsJson("{\"hold\":\"red\"}").build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).holdColor()).isEqualTo("red");
    }

    @Test
    void hold_color_parsed_with_extra_keys() {
        // 다른 키가 섞여 있어도 hold 만 추출
        FeedRow row = baseRow().withTagsJson("{\"angle\":\"slab\",\"hold\":\"blue\",\"crux\":\"heel\"}").build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);
        assertThat(page.items().get(0).holdColor()).isEqualTo("blue");
    }

    @Test
    void hold_color_null_when_tagsJson_null() {
        FeedRow row = baseRow().withTagsJson(null).build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);
        assertThat(page.items().get(0).holdColor()).isNull();
    }

    @Test
    void hold_color_null_when_tagsJson_malformed_no_crash() {
        // 잘못된 JSON 이라도 정규식 매칭만 하므로 예외 없음
        FeedRow row = baseRow().withTagsJson("not even json {{{").build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);
        assertThat(page.items().get(0).holdColor()).isNull();
    }

    @Test
    void hold_color_null_when_no_hold_key() {
        FeedRow row = baseRow().withTagsJson("{\"angle\":\"slab\"}").build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);
        assertThat(page.items().get(0).holdColor()).isNull();
    }

    @Test
    void hold_color_regex_does_not_falsely_match_escaped_quote_inside_value() {
        // 리뷰 I2 회귀 가드: 사용자 입력이 tagsJson 으로 흘러 들어가 escape 된 `\"hold\":\"..\"`
        // 가 들어와도 정규식이 false-positive 매칭하지 않음을 보장.
        FeedRow row = baseRow()
                .withTagsJson("{\"note\":\"used \\\"hold\\\":\\\"trick\\\"\"}")
                .build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);
        assertThat(page.items().get(0).holdColor()).isNull();
    }

    // --- avatarColorHue 결정성 ---

    @Test
    void avatar_color_hue_is_deterministic() {
        // 공식: (userId * 70 + 180) mod 360
        assertThat(FeedService.avatarColorHue(1L)).isEqualTo(250);   // 70 + 180 = 250
        assertThat(FeedService.avatarColorHue(10L)).isEqualTo(160);  // 700 + 180 = 880, %360 = 160
        assertThat(FeedService.avatarColorHue(100L)).isEqualTo(340); // 7000 + 180 = 7180, %360 = 340
        // 동일 입력 → 동일 출력 (캐시 가능성 검증)
        assertThat(FeedService.avatarColorHue(42L)).isEqualTo(FeedService.avatarColorHue(42L));
    }

    @Test
    void avatar_color_hue_in_view_for_returned_user() {
        FeedRow row = baseRow().withUserId(1L).build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));

        FeedPage page = service.listFeed(7L, FeedFilter.POPULAR, null, null);
        assertThat(page.items().get(0).avatarColorHue()).isEqualTo(250);
    }

    // --- nextCursor / hasNext ---

    @Test
    void next_cursor_set_to_last_feed_post_id_when_has_next() {
        // 두 개의 row, hasNext=true → 마지막 item 의 feedPostId 가 nextCursor 가 되어야 함.
        FeedRow r1 = baseRow().withFeedPostId(100L).build();
        FeedRow r2 = baseRow().withFeedPostId(50L).build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(r1, r2), true));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, 2);

        assertThat(page.items()).hasSize(2);
        assertThat(page.nextCursor()).isEqualTo(50L);
    }

    @Test
    void next_cursor_null_when_no_more_pages() {
        FeedRow r1 = baseRow().withFeedPostId(100L).build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(r1), false));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);
        assertThat(page.nextCursor()).isNull();
    }

    @Test
    void next_cursor_null_when_empty_slice() {
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(), false));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);
        assertThat(page.nextCursor()).isNull();
        assertThat(page.items()).isEmpty();
    }

    // --- liked / counts pass-through ---

    @Test
    void liked_flag_pass_through() {
        FeedRow r1 = baseRow().withLiked(true).build();
        FeedRow r2 = baseRow().withLiked(false).build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(r1, r2), false));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);
        assertThat(page.items().get(0).liked()).isTrue();
        assertThat(page.items().get(1).liked()).isFalse();
    }

    @Test
    void like_and_comment_counts_pass_through() {
        FeedRow row = baseRow().withLikeCount(7L).withCommentCount(3L).build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);
        assertThat(page.items().get(0).likes()).isEqualTo(7L);
        assertThat(page.items().get(0).comments()).isEqualTo(3L);
    }

    @Test
    void item_extId_uses_feed_post_extId_not_attempt_extId() {
        // 응답 shape 변경 회귀 가드: items.extId 는 feed_post.ext_id 로 의미 전환됨.
        FeedRow row = baseRow()
                .withFeedPostExtId("01HFEEDPOST0000000000000001")
                .withAttemptExtId("01HATTEMPT0000000000000099")
                .build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);
        assertThat(page.items().get(0).extId()).isEqualTo("01HFEEDPOST0000000000000001");
    }

    // --- POPULAR / FRIENDS 패스스루 ---

    @Test
    void popular_passes_through_with_null_gymIdFilter() {
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(empty(20));

        service.listFeed(7L, FeedFilter.POPULAR, 555L, 30);

        verify(feedRepository).findFeed(eq(7L), eq(FeedQueryMode.POPULAR), eq(555L), eq(null), any());
    }

    @Test
    void friends_passes_through_with_null_gymIdFilter() {
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(empty(20));

        service.listFeed(7L, FeedFilter.FRIENDS, null, null);

        verify(feedRepository).findFeed(eq(7L), eq(FeedQueryMode.FRIENDS), eq(null), eq(null), any());
        verify(profileRepository, never()).findById(anyLong());
    }

    @Test
    void null_filter_treated_as_popular() {
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(empty(20));

        service.listFeed(7L, null, null, null);

        verify(feedRepository).findFeed(eq(7L), eq(FeedQueryMode.POPULAR), eq(null), eq(null), any());
    }

    // --- mediaUrls 그룹핑 + cdn-base-url 합성 ---

    @Test
    void media_urls_grouped_by_post_in_seq_order() {
        // 서로 다른 post 의 미디어가 섞여 들어와도 LinkedHashMap 으로 post 별 + seq ASC 보존.
        FeedRow r1 = baseRow().withFeedPostId(100L).build();
        FeedRow r2 = baseRow().withFeedPostId(50L).build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(r1, r2), false));
        when(feedRepository.findFeedMediaForPosts(any())).thenReturn(List.of(
                new FeedMediaRow(100L, (short) 0, MediaKind.IMAGE, "media/100-0.jpg"),
                new FeedMediaRow(100L, (short) 1, MediaKind.VIDEO, "media/100-1.mp4"),
                new FeedMediaRow(50L, (short) 0, MediaKind.IMAGE, "media/50-0.jpg")
        ));

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);

        assertThat(page.items()).hasSize(2);
        // r1 (postId 100): seq 0 → 1 순. URL = cdn-base + "/" + s3Key
        assertThat(page.items().get(0).mediaUrls()).hasSize(2);
        assertThat(page.items().get(0).mediaUrls().get(0).url())
                .isEqualTo("https://cdn.test/media/100-0.jpg");
        assertThat(page.items().get(0).mediaUrls().get(0).kind()).isEqualTo(MediaKind.IMAGE);
        assertThat(page.items().get(0).mediaUrls().get(1).url())
                .isEqualTo("https://cdn.test/media/100-1.mp4");
        // 썸네일은 트랜스코드 도입 전까지 null.
        assertThat(page.items().get(0).mediaUrls().get(1).thumbnailUrl()).isNull();
        // r2 (postId 50): 단 1건
        assertThat(page.items().get(1).mediaUrls()).hasSize(1);
        assertThat(page.items().get(1).mediaUrls().get(0).url())
                .isEqualTo("https://cdn.test/media/50-0.jpg");
    }

    @Test
    void media_urls_excluded_when_cdn_base_missing() {
        // cdn-base-url 미설정 시 응답에서 모두 제외 — 클라가 깨진 이미지 표시하지 않도록.
        FeedService noBase = new FeedService(feedRepository, profileRepository, appPropsWithCdn(null));
        FeedRow row = baseRow().withFeedPostId(100L).build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));
        when(feedRepository.findFeedMediaForPosts(any())).thenReturn(List.of(
                new FeedMediaRow(100L, (short) 0, MediaKind.IMAGE, "media/100-0.jpg")
        ));

        FeedPage page = noBase.listFeed(1L, FeedFilter.POPULAR, null, null);

        assertThat(page.items().get(0).mediaUrls()).isEmpty();
    }

    @Test
    void media_urls_with_trailing_slash_in_cdn_base_does_not_double_slash() {
        // cdn-base-url 끝에 슬래시가 있어도 정확히 한 개 슬래시로 합성.
        FeedService trailing = new FeedService(feedRepository, profileRepository, appPropsWithCdn("https://cdn.test/"));
        FeedRow row = baseRow().withFeedPostId(100L).build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));
        when(feedRepository.findFeedMediaForPosts(any())).thenReturn(List.of(
                new FeedMediaRow(100L, (short) 0, MediaKind.IMAGE, "media/x.jpg")
        ));

        FeedPage page = trailing.listFeed(1L, FeedFilter.POPULAR, null, null);

        assertThat(page.items().get(0).mediaUrls().get(0).url())
                .isEqualTo("https://cdn.test/media/x.jpg");
    }

    @Test
    void media_urls_empty_list_when_post_has_no_media() {
        // 미디어 없는 post 는 빈 리스트 반환 — 클라가 array 가 항상 존재한다고 가정 가능.
        FeedRow row = baseRow().withFeedPostId(100L).build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(row), false));
        when(feedRepository.findFeedMediaForPosts(any())).thenReturn(List.of());

        FeedPage page = service.listFeed(1L, FeedFilter.POPULAR, null, null);

        assertThat(page.items().get(0).mediaUrls()).isEmpty();
    }

    @Test
    void media_lookup_called_with_post_ids_from_slice() {
        // 슬라이스 안 모든 post id 가 batch fetch 입력으로 정확히 전달되는지 — N+1 회피의 회귀 가드.
        FeedRow r1 = baseRow().withFeedPostId(100L).build();
        FeedRow r2 = baseRow().withFeedPostId(50L).build();
        FeedRow r3 = baseRow().withFeedPostId(25L).build();
        when(feedRepository.findFeed(anyLong(), any(), any(), any(), any()))
                .thenReturn(slice(List.of(r1, r2, r3), false));
        when(feedRepository.findFeedMediaForPosts(any())).thenReturn(List.of());

        service.listFeed(1L, FeedFilter.POPULAR, null, null);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Collection<Long>> idsCap =
                ArgumentCaptor.forClass(java.util.Collection.class);
        verify(feedRepository).findFeedMediaForPosts(idsCap.capture());
        assertThat(idsCap.getValue()).containsExactly(100L, 50L, 25L);
    }

    // --- helpers ---

    private static Slice<FeedRow> empty(int size) {
        return new SliceImpl<>(List.of(), PageRequest.of(0, size), false);
    }

    private static Slice<FeedRow> slice(List<FeedRow> rows, boolean hasNext) {
        int size = Math.max(rows.size(), 1);
        return new SliceImpl<>(rows, PageRequest.of(0, size), hasNext);
    }

    private static FeedRowBuilder baseRow() {
        return new FeedRowBuilder();
    }

    /** FeedRow 는 record 이므로 모든 필드를 기본값으로 채우는 빌더가 테스트 가독성에 도움. */
    private static class FeedRowBuilder {
        private long feedPostId = 1000L;
        private String feedPostExtId = "01HFEEDPOST0000000000000001";
        private Long attemptId = 1L;
        private String attemptExtId = "01HATTEMPT0000000000000001";
        private long userId = 1L;
        private String userExtId = "01HUSER0000000000000000001";
        private String nickname = "서지우";
        private String gymName = "서울볼더스 성수";
        private AttemptResult result = AttemptResult.SEND;
        private String gradeValue = "V5";
        private BigDecimal gradeNumeric = BigDecimal.valueOf(5);
        private String tagsJson = null;
        private String holdColor = null;
        private String note = null;
        private Instant loggedAt = Instant.parse("2026-04-25T07:00:00Z");
        private long likeCount = 0L;
        private long commentCount = 0L;
        private boolean liked = false;

        FeedRowBuilder withFeedPostId(long v) { this.feedPostId = v; return this; }
        FeedRowBuilder withFeedPostExtId(String v) { this.feedPostExtId = v; return this; }
        FeedRowBuilder withAttemptExtId(String v) { this.attemptExtId = v; return this; }
        FeedRowBuilder withUserId(long v) { this.userId = v; return this; }
        FeedRowBuilder withTagsJson(String v) { this.tagsJson = v; return this; }
        FeedRowBuilder withHoldColor(String v) { this.holdColor = v; return this; }
        FeedRowBuilder withLikeCount(long v) { this.likeCount = v; return this; }
        FeedRowBuilder withCommentCount(long v) { this.commentCount = v; return this; }
        FeedRowBuilder withLiked(boolean v) { this.liked = v; return this; }

        FeedRow build() {
            return new FeedRow(feedPostId, feedPostExtId, attemptId, attemptExtId,
                    userId, userExtId, nickname, gymName,
                    result, gradeValue, gradeNumeric, tagsJson, holdColor, note, loggedAt,
                    likeCount, commentCount, liked);
        }
    }
}
