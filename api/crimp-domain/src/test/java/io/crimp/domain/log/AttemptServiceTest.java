package io.crimp.domain.log;

import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.entity.enums.PostVisibility;
import io.crimp.core.entity.feed.FeedPost;
import io.crimp.core.entity.feed.PostMedia;
import io.crimp.core.entity.log.ClimbingSession;
import io.crimp.core.entity.log.SessionAttempt;
import io.crimp.core.repository.feed.FeedPostRepository;
import io.crimp.core.repository.feed.PostMediaRepository;
import io.crimp.core.repository.log.ClimbingSessionRepository;
import io.crimp.core.repository.log.SessionAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttemptServiceTest {

    private ClimbingSessionRepository sessionRepo;
    private SessionAttemptRepository attemptRepo;
    private FeedPostRepository feedPostRepo;
    private PostMediaRepository postMediaRepo;
    private AttemptService service;

    @BeforeEach
    void setUp() {
        sessionRepo = mock(ClimbingSessionRepository.class);
        attemptRepo = mock(SessionAttemptRepository.class);
        feedPostRepo = mock(FeedPostRepository.class);
        postMediaRepo = mock(PostMediaRepository.class);
        service = new AttemptService(sessionRepo, attemptRepo, feedPostRepo, postMediaRepo);
    }

    @Test
    void log_creates_attempt_under_owned_session() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            // 저장 시 id 부여 (FK 무결성 시뮬레이션)
            setField(arg, "id", 1234L);
            return arg;
        });
        when(feedPostRepo.findByAttemptId(anyLong())).thenReturn(Optional.empty());

        var cmd = new LogAttemptCommand(
                null, 7L, "V3", new java.math.BigDecimal("3.0"),
                AttemptResult.SEND, 2, null, "메모", null,
                "red",
                Instant.parse("2026-04-20T10:30:00Z"));
        var view = service.log(42L, "01HSESS", cmd);

        assertThat(view.extId()).hasSize(26);
        assertThat(view.result()).isEqualTo(AttemptResult.SEND);
        assertThat(view.attempts()).isEqualTo(2);
        assertThat(view.gradeValue()).isEqualTo("V3");
        // [PR #93, F5 PR-4] holdColor 가 entity 까지 흘러가는지 검증.
        assertThat(view.holdColor()).isEqualTo("red");
        verify(attemptRepo).save(any(SessionAttempt.class));
    }

    @Test
    void log_with_mediaId_saves_post_media_link() {
        // attempt.mediaId 가 있을 때 자동 게시 흐름이 post_media 까지 INSERT 하는지.
        // 이게 빠지면 피드 응답의 mediaUrls 가 항상 빈 배열이 되는 회귀.
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            setField(arg, "id", 1234L);
            return arg;
        });
        when(feedPostRepo.findByAttemptId(anyLong())).thenReturn(Optional.empty());
        when(feedPostRepo.save(any(FeedPost.class))).thenAnswer(i -> {
            FeedPost arg = i.getArgument(0);
            setField(arg, "id", 5555L);
            return arg;
        });

        var cmd = new LogAttemptCommand(
                null, 7L, "V3", new java.math.BigDecimal("3.0"),
                AttemptResult.SEND, 1, 999L, "메모", null,
                "red",
                Instant.parse("2026-04-20T10:30:00Z"));
        service.log(42L, "01HSESS", cmd);

        ArgumentCaptor<PostMedia> captor = ArgumentCaptor.forClass(PostMedia.class);
        verify(postMediaRepo).save(captor.capture());
        PostMedia pm = captor.getValue();
        assertThat(pm.getId().getPostId()).isEqualTo(5555L);
        assertThat(pm.getId().getMediaId()).isEqualTo(999L);
        assertThat(pm.getSeq()).isEqualTo((short) 0);
    }

    @Test
    void log_without_mediaId_does_not_save_post_media() {
        // 미디어 없는 시도는 post_media INSERT 도 없어야 함 (불필요 row 방지).
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            setField(arg, "id", 1234L);
            return arg;
        });
        when(feedPostRepo.findByAttemptId(anyLong())).thenReturn(Optional.empty());
        when(feedPostRepo.save(any(FeedPost.class))).thenAnswer(i -> i.getArgument(0));

        var cmd = new LogAttemptCommand(
                null, 7L, "V3", new java.math.BigDecimal("3.0"),
                AttemptResult.SEND, 1, null, "메모", null,
                "red",
                Instant.parse("2026-04-20T10:30:00Z"));
        service.log(42L, "01HSESS", cmd);

        verify(postMediaRepo, never()).save(any());
    }

    @Test
    void log_fail_with_mediaId_does_not_publish_or_link() {
        // FAIL/TRY 는 자동 게시 대상이 아니므로 mediaId 가 있어도 post_media 도 안 만듦.
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            setField(arg, "id", 1234L);
            return arg;
        });

        var cmd = new LogAttemptCommand(
                null, 7L, "V3", null,
                AttemptResult.FAIL, 1, 999L, null, null, null,
                Instant.parse("2026-04-20T10:30:00Z"));
        service.log(42L, "01HSESS", cmd);

        verify(feedPostRepo, never()).save(any());
        verify(postMediaRepo, never()).save(any());
    }

    @Test
    void log_requires_result() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        var cmd = new LogAttemptCommand(null, null, null, null, null, null, null, null, null, null, null);
        assertThatThrownBy(() -> service.log(42L, "01HSESS", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("ATTEMPT_INVALID"));
    }

    @Test
    void log_rejects_attempts_below_one() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        var cmd = new LogAttemptCommand(null, null, null, null, AttemptResult.TRY, 0, null, null, null, null, null);
        assertThatThrownBy(() -> service.log(42L, "01HSESS", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("ATTEMPT_INVALID"));
    }

    @Test
    void log_rejects_attempts_above_max() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        var cmd = new LogAttemptCommand(null, null, null, null, AttemptResult.TRY, 40000, null, null, null, null, null);
        assertThatThrownBy(() -> service.log(42L, "01HSESS", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("ATTEMPT_INVALID"));
    }

    @Test
    void log_foreign_session_is_404() {
        ClimbingSession s = session(100L, "01HSESS", 99L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        var cmd = new LogAttemptCommand(null, null, null, null, AttemptResult.SEND, 1, null, null, null, null, null);
        assertThatThrownBy(() -> service.log(42L, "01HSESS", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("SESSION_NOT_FOUND"));
    }

    @Test
    void list_returns_attempts_ordered_by_loggedAt() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        SessionAttempt a1 = attempt(1L, "01HATT01", 100L, AttemptResult.TRY);
        SessionAttempt a2 = attempt(2L, "01HATT02", 100L, AttemptResult.SEND);
        when(attemptRepo.findBySessionIdOrderByLoggedAt(100L)).thenReturn(List.of(a1, a2));

        var items = service.listBySession(42L, "01HSESS");
        assertThat(items).extracting(AttemptView::extId).containsExactly("01HATT01", "01HATT02");
    }

    @Test
    void update_foreign_session_is_404() {
        SessionAttempt a = attempt(1L, "01HATT", 100L, AttemptResult.TRY);
        ClimbingSession s = session(100L, "01HSESS", 99L, false);
        when(attemptRepo.findByExtId("01HATT")).thenReturn(Optional.of(a));
        when(sessionRepo.findById(100L)).thenReturn(Optional.of(s));

        var cmd = new UpdateAttemptCommand(null, null, null, null, AttemptResult.SEND, null, null, null, null, null);
        assertThatThrownBy(() -> service.update(42L, "01HATT", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("ATTEMPT_NOT_FOUND"));
    }

    @Test
    void update_partial_fields_applied() {
        SessionAttempt a = attempt(1L, "01HATT", 100L, AttemptResult.TRY);
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(attemptRepo.findByExtId("01HATT")).thenReturn(Optional.of(a));
        when(sessionRepo.findById(100L)).thenReturn(Optional.of(s));

        var cmd = new UpdateAttemptCommand(
                5L, null, "V4", null,
                AttemptResult.SEND, 3, null, "업데이트", null, "blue");
        var view = service.update(42L, "01HATT", cmd);
        assertThat(view.result()).isEqualTo(AttemptResult.SEND);
        assertThat(view.attempts()).isEqualTo(3);
        assertThat(view.gradeValue()).isEqualTo("V4");
        assertThat(view.note()).isEqualTo("업데이트");
        // [PR #93 리뷰 S2] holdColor 도 entity 까지 도달해야 함.
        assertThat(view.holdColor()).isEqualTo("blue");
    }

    @Test
    void log_null_holdColor_keeps_entity_holdColor_null() {
        // [PR #93 리뷰 S2] holdColor 안 보낸 경우 entity 의 holdColor 가 null 로 유지.
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            setField(arg, "id", 1L);
            return arg;
        });
        when(feedPostRepo.findByAttemptId(anyLong())).thenReturn(Optional.empty());

        var cmd = new LogAttemptCommand(
                null, null, null, null, AttemptResult.TRY, 1, null, null, null, null, null);
        var view = service.log(42L, "01HSESS", cmd);
        assertThat(view.holdColor()).isNull();
    }

    @Test
    void log_emptyOrWhitespace_holdColor_is_normalized_to_null() {
        // [PR #93 리뷰 S3] 빈 문자열 / 공백은 null 과 동일 처리 (note 정책과 일관).
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            setField(arg, "id", 1L);
            return arg;
        });
        when(feedPostRepo.findByAttemptId(anyLong())).thenReturn(Optional.empty());

        var cmd = new LogAttemptCommand(
                null, null, null, null, AttemptResult.TRY, 1, null, null, null, "  ", null);
        var view = service.log(42L, "01HSESS", cmd);
        assertThat(view.holdColor()).isNull();
    }

    @Test
    void log_unknown_holdColor_is_rejected_as_ATTEMPT_INVALID() {
        // [PR #93 리뷰 S1] 화이트리스트 외 값은 도메인 단에서 차단.
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));

        var cmd = new LogAttemptCommand(
                null, null, null, null, AttemptResult.TRY, 1, null, null, null, "magenta", null);
        assertThatThrownBy(() -> service.log(42L, "01HSESS", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("ATTEMPT_INVALID"));
    }

    @Test
    void delete_owned_attempt() {
        SessionAttempt a = attempt(1L, "01HATT", 100L, AttemptResult.TRY);
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(attemptRepo.findByExtId("01HATT")).thenReturn(Optional.of(a));
        when(sessionRepo.findById(100L)).thenReturn(Optional.of(s));
        when(feedPostRepo.findByAttemptId(1L)).thenReturn(Optional.empty());

        service.delete(42L, "01HATT");
        verify(attemptRepo).delete(a);
        verify(feedPostRepo).findByAttemptId(1L);
    }

    @Test
    void delete_attempt_with_auto_published_post_soft_deletes_post() {
        // B1: 자동 게시된 SEND/FLASH/ONSIGHT 시도를 삭제하면 연결된 FeedPost 도 같이 soft-delete.
        // FK ON DELETE SET NULL 도 V908 에 적용돼 있어 attempt hard-delete 가 거절되진 않지만,
        // 피드에서 "유령" post 가 보이지 않도록 가시성을 명시 차단한다.
        SessionAttempt a = attempt(1L, "01HATT", 100L, AttemptResult.SEND);
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        FeedPost post = FeedPost.fromAttempt(
                "01HPOST", 42L, "test", 100L, 1L, 7L, PostVisibility.PUBLIC);
        when(attemptRepo.findByExtId("01HATT")).thenReturn(Optional.of(a));
        when(sessionRepo.findById(100L)).thenReturn(Optional.of(s));
        when(feedPostRepo.findByAttemptId(1L)).thenReturn(Optional.of(post));

        assertThat(post.isDeleted()).isFalse();
        service.delete(42L, "01HATT");

        assertThat(post.isDeleted()).isTrue();
        verify(attemptRepo).delete(a);
    }

    @Test
    void delete_attempt_with_already_softdeleted_post_is_idempotent() {
        // 이미 soft-delete 된 FeedPost 는 다시 soft-delete 호출하지 않는다 (deletedAt 안 바뀜).
        SessionAttempt a = attempt(1L, "01HATT", 100L, AttemptResult.SEND);
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        FeedPost post = FeedPost.fromAttempt(
                "01HPOST", 42L, "test", 100L, 1L, 7L, PostVisibility.PUBLIC);
        post.softDelete();
        Instant deletedAtBefore = post.getDeletedAt();
        when(attemptRepo.findByExtId("01HATT")).thenReturn(Optional.of(a));
        when(sessionRepo.findById(100L)).thenReturn(Optional.of(s));
        when(feedPostRepo.findByAttemptId(1L)).thenReturn(Optional.of(post));

        service.delete(42L, "01HATT");

        assertThat(post.getDeletedAt()).isEqualTo(deletedAtBefore);
        verify(attemptRepo).delete(a);
    }

    // --- I1: PATCH result 자동 게시 재평가 ---

    @Test
    void update_fail_to_send_auto_publishes() {
        // FAIL 로 기록 → SEND 로 PATCH → 자동 게시 트리거.
        SessionAttempt a = attempt(1L, "01HATT", 100L, AttemptResult.FAIL);
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(attemptRepo.findByExtId("01HATT")).thenReturn(Optional.of(a));
        when(sessionRepo.findById(100L)).thenReturn(Optional.of(s));
        when(feedPostRepo.findByAttemptId(1L)).thenReturn(Optional.empty());

        var cmd = new UpdateAttemptCommand(
                null, null, null, null, AttemptResult.SEND, null, null, null, null, null);
        service.update(42L, "01HATT", cmd);

        verify(feedPostRepo).save(any(FeedPost.class));
    }

    @Test
    void update_send_to_fail_soft_deletes_existing_post() {
        // SEND 로 자동 게시된 시도를 FAIL 로 PATCH → 기존 FeedPost soft-delete (피드 숨김).
        SessionAttempt a = attempt(1L, "01HATT", 100L, AttemptResult.SEND);
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        FeedPost post = FeedPost.fromAttempt(
                "01HPOST", 42L, "test", 100L, 1L, 7L, PostVisibility.PUBLIC);
        when(attemptRepo.findByExtId("01HATT")).thenReturn(Optional.of(a));
        when(sessionRepo.findById(100L)).thenReturn(Optional.of(s));
        when(feedPostRepo.findByAttemptId(1L)).thenReturn(Optional.of(post));

        var cmd = new UpdateAttemptCommand(
                null, null, null, null, AttemptResult.FAIL, null, null, null, null, null);
        service.update(42L, "01HATT", cmd);

        assertThat(post.isDeleted()).isTrue();
        // FAIL 전환이라 신규 게시 호출은 없어야 함.
        verify(feedPostRepo, never()).save(any(FeedPost.class));
    }

    @Test
    void update_send_to_flash_idempotent_no_duplicate_post() {
        // SEND → FLASH (둘 다 자동 게시 대상). 이미 게시된 post 가 있으니 멱등 skip.
        SessionAttempt a = attempt(1L, "01HATT", 100L, AttemptResult.SEND);
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        FeedPost existing = FeedPost.fromAttempt(
                "01HPOST", 42L, "test", 100L, 1L, 7L, PostVisibility.PUBLIC);
        when(attemptRepo.findByExtId("01HATT")).thenReturn(Optional.of(a));
        when(sessionRepo.findById(100L)).thenReturn(Optional.of(s));
        when(feedPostRepo.findByAttemptId(1L)).thenReturn(Optional.of(existing));

        var cmd = new UpdateAttemptCommand(
                null, null, null, null, AttemptResult.FLASH, null, null, null, null, null);
        service.update(42L, "01HATT", cmd);

        // 이미 게시되어 있고, deleted 상태 아님 → 신규 save 도, soft-delete 도 없어야.
        verify(feedPostRepo, never()).save(any(FeedPost.class));
        assertThat(existing.isDeleted()).isFalse();
    }

    // --- 자동 게시 (auto-publish) ---

    @Test
    void log_send_auto_publishes_feed_post() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            setField(arg, "id", 555L);
            return arg;
        });
        when(feedPostRepo.findByAttemptId(555L)).thenReturn(Optional.empty());

        var cmd = new LogAttemptCommand(
                null, 7L, "V3", null, AttemptResult.SEND, 1, null, "기념 등반", null, null, null);
        service.log(42L, "01HSESS", cmd);

        ArgumentCaptor<FeedPost> postCap = ArgumentCaptor.forClass(FeedPost.class);
        verify(feedPostRepo).save(postCap.capture());
        FeedPost saved = postCap.getValue();
        assertThat(saved.getAttemptId()).isEqualTo(555L);
        assertThat(saved.getUserId()).isEqualTo(42L);
        assertThat(saved.getGymId()).isEqualTo(7L);
        assertThat(saved.getSessionId()).isEqualTo(100L);
        assertThat(saved.getContent()).isEqualTo("기념 등반");
        assertThat(saved.getVisibility()).isEqualTo(PostVisibility.PUBLIC);
        assertThat(saved.getExtId()).hasSize(26);
    }

    @Test
    void log_flash_auto_publishes() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            setField(arg, "id", 1L);
            return arg;
        });
        when(feedPostRepo.findByAttemptId(anyLong())).thenReturn(Optional.empty());

        var cmd = new LogAttemptCommand(
                null, null, null, null, AttemptResult.FLASH, 1, null, null, null, null, null);
        service.log(42L, "01HSESS", cmd);

        verify(feedPostRepo).save(any(FeedPost.class));
    }

    @Test
    void log_onsight_auto_publishes() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            setField(arg, "id", 1L);
            return arg;
        });
        when(feedPostRepo.findByAttemptId(anyLong())).thenReturn(Optional.empty());

        var cmd = new LogAttemptCommand(
                null, null, null, null, AttemptResult.ONSIGHT, 1, null, null, null, null, null);
        service.log(42L, "01HSESS", cmd);

        verify(feedPostRepo).save(any(FeedPost.class));
    }

    @Test
    void log_fail_does_not_auto_publish() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            setField(arg, "id", 1L);
            return arg;
        });

        var cmd = new LogAttemptCommand(
                null, null, null, null, AttemptResult.FAIL, 1, null, null, null, null, null);
        service.log(42L, "01HSESS", cmd);

        verify(feedPostRepo, never()).save(any(FeedPost.class));
        // findByAttemptId 도 호출되지 않아야 — result 가 자동 게시 대상 아니면 즉시 skip.
        verify(feedPostRepo, never()).findByAttemptId(anyLong());
    }

    @Test
    void log_try_does_not_auto_publish() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            setField(arg, "id", 1L);
            return arg;
        });

        var cmd = new LogAttemptCommand(
                null, null, null, null, AttemptResult.TRY, 1, null, null, null, null, null);
        service.log(42L, "01HSESS", cmd);

        verify(feedPostRepo, never()).save(any(FeedPost.class));
    }

    @Test
    void log_idempotent_when_feed_post_already_exists_for_attempt() {
        // defense-in-depth: 동일 attempt_id 로 이미 게시된 row 가 있다면 두 번째 자동 게시 skip.
        // 정상 흐름에서는 매 호출마다 새 attempt id 가 부여되어 발생하지 않지만, 재시도/리플레이
        // 가드.
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> {
            SessionAttempt arg = i.getArgument(0);
            setField(arg, "id", 999L);
            return arg;
        });
        when(feedPostRepo.findByAttemptId(999L)).thenReturn(Optional.of(mock(FeedPost.class)));

        var cmd = new LogAttemptCommand(
                null, null, null, null, AttemptResult.SEND, 1, null, null, null, null, null);
        service.log(42L, "01HSESS", cmd);

        verify(feedPostRepo, never()).save(any(FeedPost.class));
    }

    // --- helpers ---

    private static ClimbingSession session(long id, String extId, long userId, boolean deleted) {
        ClimbingSession cs = ClimbingSession.start(extId, userId, null, null, Instant.parse("2026-04-20T10:00:00Z"));
        setField(cs, "id", id);
        if (deleted) cs.softDelete();
        return cs;
    }

    private static SessionAttempt attempt(long id, String extId, long sessionId, AttemptResult result) {
        SessionAttempt a = SessionAttempt.log(extId, sessionId, null, result, 1, Instant.parse("2026-04-20T10:30:00Z"));
        setField(a, "id", id);
        return a;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Class<?> c = target.getClass();
            while (c != null) {
                try {
                    Field f = c.getDeclaredField(name);
                    f.setAccessible(true);
                    f.set(target, value);
                    return;
                } catch (NoSuchFieldException e) {
                    c = c.getSuperclass();
                }
            }
            throw new IllegalStateException("no field: " + name);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
