package io.crimp.domain.log;

import io.crimp.common.id.UlidGenerator;
import io.crimp.core.entity.log.ClimbingSession;
import io.crimp.core.entity.log.SessionAttempt;
import io.crimp.core.repository.log.ClimbingSessionRepository;
import io.crimp.core.repository.log.SessionAttemptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@org.springframework.context.annotation.Profile("!test")
public class AttemptService {

    private final ClimbingSessionRepository sessionRepository;
    private final SessionAttemptRepository attemptRepository;

    public AttemptService(
            ClimbingSessionRepository sessionRepository,
            SessionAttemptRepository attemptRepository) {
        this.sessionRepository = sessionRepository;
        this.attemptRepository = attemptRepository;
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
        return toView(attempt);
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
