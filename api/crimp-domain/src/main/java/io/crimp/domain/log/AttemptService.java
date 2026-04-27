package io.crimp.domain.log;

import io.crimp.common.id.UlidGenerator;
import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.entity.enums.PostVisibility;
import io.crimp.core.entity.feed.FeedPost;
import io.crimp.core.entity.log.ClimbingSession;
import io.crimp.core.entity.log.SessionAttempt;
import io.crimp.core.repository.feed.FeedPostRepository;
import io.crimp.core.repository.log.ClimbingSessionRepository;
import io.crimp.core.repository.log.SessionAttemptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@org.springframework.context.annotation.Profile("!test")
public class AttemptService {

    /**
     * 시도 자동 게시 트리거 결과 코드 — 성공한 시도만 피드에 노출한다.
     * FAIL/TRY 는 게시 대상이 아니다.
     */
    private static final Set<AttemptResult> AUTO_PUBLISH_RESULTS =
            EnumSet.of(AttemptResult.SEND, AttemptResult.FLASH, AttemptResult.ONSIGHT);

    private final ClimbingSessionRepository sessionRepository;
    private final SessionAttemptRepository attemptRepository;
    private final FeedPostRepository feedPostRepository;

    public AttemptService(
            ClimbingSessionRepository sessionRepository,
            SessionAttemptRepository attemptRepository,
            FeedPostRepository feedPostRepository) {
        this.sessionRepository = sessionRepository;
        this.attemptRepository = attemptRepository;
        this.feedPostRepository = feedPostRepository;
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
        return toView(attempt);
    }

    @Transactional
    public void delete(long userId, String attemptExtId) {
        SessionAttempt attempt = fetchOwnedAttempt(userId, attemptExtId);
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
                a.getLoggedAt()
        );
    }
}
