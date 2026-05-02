package io.crimp.domain.log;

import io.crimp.common.id.UlidGenerator;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@org.springframework.context.annotation.Profile("!test")
public class AttemptService {

    private static final Logger log = LoggerFactory.getLogger(AttemptService.class);

    /**
     * 시도 자동 게시 트리거 결과 코드 — 성공한 시도만 피드에 노출한다.
     * FAIL/TRY 는 게시 대상이 아니다.
     */
    private static final Set<AttemptResult> AUTO_PUBLISH_RESULTS =
            EnumSet.of(AttemptResult.SEND, AttemptResult.FLASH, AttemptResult.ONSIGHT);

    /**
     * hold_color 화이트리스트 (PR #93, F5 PR-4 — 리뷰 S1). 클라가 임의 문자열을 보낼 수 있게
     * 두면 검색·통계가 더러워지므로 도메인 단에서 enum-like 가드. 프론트 `HOLD_OPTIONS` 와 일치.
     */
    private static final Set<String> ALLOWED_HOLD_COLORS = Set.of(
            "red", "blue", "yellow", "green", "white",
            "black", "pink", "orange", "purple", "gray");

    private final ClimbingSessionRepository sessionRepository;
    private final SessionAttemptRepository attemptRepository;
    private final FeedPostRepository feedPostRepository;
    private final PostMediaRepository postMediaRepository;

    public AttemptService(
            ClimbingSessionRepository sessionRepository,
            SessionAttemptRepository attemptRepository,
            FeedPostRepository feedPostRepository,
            PostMediaRepository postMediaRepository) {
        this.sessionRepository = sessionRepository;
        this.attemptRepository = attemptRepository;
        this.feedPostRepository = feedPostRepository;
        this.postMediaRepository = postMediaRepository;
    }

    @Transactional
    public AttemptView log(long userId, String sessionExtId, LogAttemptCommand cmd) {
        ClimbingSession session = fetchOwnedSession(userId, sessionExtId);
        if (cmd.result() == null) {
            throw new SessionException("ATTEMPT_INVALID", "result is required");
        }
        int attemptCount = cmd.attempts() == null ? 1 : cmd.attempts();
        if (attemptCount < 1 || attemptCount > SessionAttempt.MAX_ATTEMPTS) {
            throw new SessionException("ATTEMPT_INVALID",
                    "attempts must be between 1 and " + SessionAttempt.MAX_ATTEMPTS);
        }
        Instant loggedAt = cmd.loggedAt() != null ? cmd.loggedAt() : Instant.now();

        SessionAttempt attempt = SessionAttempt.log(
                UlidGenerator.next(),
                session.getId(),
                cmd.routeId(),
                cmd.result(),
                attemptCount,
                loggedAt);
        if (cmd.gymId() != null) attempt.updateGymId(cmd.gymId());
        if (cmd.gradeValue() != null) attempt.updateGradeValue(cmd.gradeValue());
        if (cmd.gradeNumeric() != null) attempt.updateGradeNumeric(cmd.gradeNumeric());
        if (cmd.mediaId() != null) attempt.updateMediaId(cmd.mediaId());
        if (cmd.note() != null) attempt.updateNote(cmd.note());
        if (cmd.tagsJson() != null) attempt.updateTagsJson(cmd.tagsJson());
        String normalizedHold = normalizeHoldColor(cmd.holdColor());
        if (normalizedHold != null) attempt.updateHoldColor(normalizedHold);

        attemptRepository.save(attempt);

        // 자동 게시: 동일 트랜잭션에서 FeedPost 도 같이 생성. 실패하면 시도 저장도 롤백되어
        // 카운터/피드 일관성이 유지된다.
        autoPublishToFeed(attempt, userId);

        return toView(attempt);
    }

    /**
     * SEND/FLASH/ONSIGHT 시도에 대해 1:1 FeedPost 생성. 이미 attempt_id 로 게시된 row 가 있으면
     * 멱등 skip. 동일 attempt 가 두 번 들어오는 일은 정상 흐름에서는 없지만, 재시도/리플레이를
     * defense-in-depth 로 가드.
     *
     * <p>{@code attempt.mediaId} 가 있으면 동일 트랜잭션에서 {@code post_media} 도 INSERT —
     * 이게 빠지면 피드 응답의 {@code mediaUrls} 가 항상 빈 배열로 떨어진다 (실제 staging
     * 회귀 사례). attempt 는 단일 media_id 만 들고 있으므로 seq=0 고정.
     */
    private void autoPublishToFeed(SessionAttempt attempt, long userId) {
        if (!AUTO_PUBLISH_RESULTS.contains(attempt.getResult())) {
            return;
        }
        if (feedPostRepository.findByAttemptId(attempt.getId()).isPresent()) {
            return;
        }
        FeedPost post = FeedPost.fromAttempt(
                UlidGenerator.next(),
                userId,
                attempt.getNote(), // 시도 메모를 그대로 게시 본문으로
                attempt.getSessionId(),
                attempt.getId(),
                attempt.getGymId(),
                PostVisibility.PUBLIC);
        feedPostRepository.save(post);
        boolean linked = false;
        if (attempt.getMediaId() != null) {
            postMediaRepository.save(PostMedia.attach(post.getId(), attempt.getMediaId(), 0));
            linked = true;
        }
        // 회귀 진단 가시성 — 다음 번 post_media 누락이 발생해도 로그 한 줄로 식별 가능.
        log.info("[feed] auto-publish post={} attempt={} media={} linked={}",
                post.getId(), attempt.getId(), attempt.getMediaId(), linked);
    }

    @Transactional(readOnly = true)
    public List<AttemptView> listBySession(long userId, String sessionExtId) {
        ClimbingSession session = fetchOwnedSession(userId, sessionExtId);
        return attemptRepository.findBySessionIdOrderByLoggedAt(session.getId())
                .stream().map(AttemptService::toView).toList();
    }

    @Transactional
    public AttemptView update(long userId, String attemptExtId, UpdateAttemptCommand cmd) {
        SessionAttempt attempt = fetchOwnedAttempt(userId, attemptExtId);
        if (cmd.attempts() != null && (cmd.attempts() < 1 || cmd.attempts() > SessionAttempt.MAX_ATTEMPTS)) {
            throw new SessionException("ATTEMPT_INVALID",
                    "attempts must be between 1 and " + SessionAttempt.MAX_ATTEMPTS);
        }
        if (cmd.routeId() != null) attempt.updateRoute(cmd.routeId());
        if (cmd.gymId() != null) attempt.updateGymId(cmd.gymId());
        if (cmd.gradeValue() != null) attempt.updateGradeValue(cmd.gradeValue());
        if (cmd.gradeNumeric() != null) attempt.updateGradeNumeric(cmd.gradeNumeric());
        if (cmd.result() != null) attempt.updateResult(cmd.result());
        if (cmd.attempts() != null) attempt.updateAttempts(cmd.attempts());
        if (cmd.mediaId() != null) attempt.updateMediaId(cmd.mediaId());
        if (cmd.note() != null) attempt.updateNote(cmd.note());
        if (cmd.tagsJson() != null) attempt.updateTagsJson(cmd.tagsJson());
        String normalizedHold = normalizeHoldColor(cmd.holdColor());
        if (normalizedHold != null) attempt.updateHoldColor(normalizedHold);

        // I1: result PATCH 가 자동 게시 정책에 영향. SEND/FLASH/ONSIGHT 로 전환되면 신규 게시,
        // 반대로 FAIL/TRY 로 전환되면 기존 게시를 soft-delete 하여 피드에서 숨긴다.
        // 같은 result 유지면 멱등(autoPublishToFeed 의 findByAttemptId 가드).
        ClimbingSession session = sessionRepository.findById(attempt.getSessionId())
                .orElseThrow(() -> new SessionException("ATTEMPT_NOT_FOUND",
                        "Attempt " + attemptExtId + " not found"));
        if (AUTO_PUBLISH_RESULTS.contains(attempt.getResult())) {
            autoPublishToFeed(attempt, session.getUserId());
        } else {
            feedPostRepository.findByAttemptId(attempt.getId())
                    .ifPresent(post -> {
                        if (!post.isDeleted()) {
                            post.softDelete();
                        }
                    });
        }
        return toView(attempt);
    }

    @Transactional
    public void delete(long userId, String attemptExtId) {
        SessionAttempt attempt = fetchOwnedAttempt(userId, attemptExtId);
        // B1: 자동 게시된 FeedPost 도 같은 트랜잭션에서 soft-delete. V908 의 FK 가
        // ON DELETE SET NULL 로 정의돼 있어 attempt hard-delete 가 거절되진 않지만,
        // 피드에 "유령" post (attempt_id NULL, content=note) 가 남는 것을 방지하려면
        // 명시적으로 게시 가시성을 차단한다. 정상 사용자 의도: "내 시도 삭제 = 피드에서도 사라짐".
        feedPostRepository.findByAttemptId(attempt.getId())
                .ifPresent(post -> {
                    if (!post.isDeleted()) {
                        post.softDelete();
                    }
                });
        attemptRepository.delete(attempt);
    }

    private ClimbingSession fetchOwnedSession(long userId, String sessionExtId) {
        ClimbingSession session = sessionRepository.findByExtId(sessionExtId)
                .orElseThrow(() -> new SessionException("SESSION_NOT_FOUND", "Session " + sessionExtId + " not found"));
        if (session.isDeleted() || session.getUserId() == null || session.getUserId() != userId) {
            throw new SessionException("SESSION_NOT_FOUND", "Session " + sessionExtId + " not found");
        }
        return session;
    }

    private SessionAttempt fetchOwnedAttempt(long userId, String attemptExtId) {
        SessionAttempt attempt = attemptRepository.findByExtId(attemptExtId)
                .orElseThrow(() -> new SessionException("ATTEMPT_NOT_FOUND", "Attempt " + attemptExtId + " not found"));
        // attempt 소유권 확인: 상위 세션이 본인 소유이고 삭제 안 됨
        ClimbingSession session = sessionRepository.findById(attempt.getSessionId())
                .orElseThrow(() -> new SessionException("ATTEMPT_NOT_FOUND", "Attempt " + attemptExtId + " not found"));
        if (session.isDeleted() || session.getUserId() == null || session.getUserId() != userId) {
            throw new SessionException("ATTEMPT_NOT_FOUND", "Attempt " + attemptExtId + " not found");
        }
        return attempt;
    }

    /**
     * holdColor 입력 정규화 + 화이트리스트 검증 (PR #93, F5 PR-4 — 리뷰 S1 + S3).
     * <ul>
     *   <li>null → null (변경 없음)</li>
     *   <li>trim 후 빈 문자열 → null (note 와 동일 정책)</li>
     *   <li>화이트리스트 외 값 → {@link SessionException} ATTEMPT_INVALID 400</li>
     * </ul>
     */
    private static String normalizeHoldColor(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim().toLowerCase();
        if (trimmed.isEmpty()) return null;
        if (!ALLOWED_HOLD_COLORS.contains(trimmed)) {
            throw new SessionException("ATTEMPT_INVALID",
                    "Unknown hold color: " + raw + " (allowed: " + ALLOWED_HOLD_COLORS + ")");
        }
        return trimmed;
    }

    private static AttemptView toView(SessionAttempt a) {
        return new AttemptView(
                a.getExtId(),
                a.getRouteId(),
                a.getGymId(),
                a.getGradeValue(),
                a.getGradeNumeric(),
                a.getResult(),
                a.getAttempts() == null ? 0 : a.getAttempts().intValue(),
                a.getMediaId(),
                a.getNote(),
                a.getTagsJson(),
                a.getHoldColor(),
                a.getLoggedAt()
        );
    }
}
