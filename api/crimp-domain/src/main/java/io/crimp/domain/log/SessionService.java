package io.crimp.domain.log;

import io.crimp.common.id.UlidGenerator;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.log.ClimbingSession;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.log.ClimbingSessionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@org.springframework.context.annotation.Profile("!test")
public class SessionService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final ClimbingSessionRepository sessionRepository;
    private final GymRepository gymRepository;

    public SessionService(
            ClimbingSessionRepository sessionRepository,
            GymRepository gymRepository) {
        this.sessionRepository = sessionRepository;
        this.gymRepository = gymRepository;
    }

    @Transactional
    public SessionView start(long userId, StartSessionCommand cmd) {
        if (cmd.startedAt() == null) {
            throw new SessionException("SESSION_INVALID", "startedAt is required");
        }

        Long resolvedGymId = cmd.gymId();
        String resolvedGymNameRaw = cmd.gymNameRaw();

        // gymExtId 가 제공되면 내부 id 로 해석. 클라이언트가 gymNameRaw 를 주지 않았다면
        // Gym 엔티티의 공식 name 으로 fallback 한다.
        String extId = cmd.gymExtId();
        if (extId != null && !extId.isBlank()) {
            Gym gym = gymRepository.findByExtId(extId)
                    .orElseThrow(() -> new SessionException(
                            "GYM_NOT_FOUND", "Gym " + extId + " not found"));
            resolvedGymId = gym.getId();
            if (resolvedGymNameRaw == null || resolvedGymNameRaw.isBlank()) {
                resolvedGymNameRaw = gym.getName();
            }
        }

        ClimbingSession session = ClimbingSession.start(
                UlidGenerator.next(), userId, resolvedGymId, resolvedGymNameRaw, cmd.startedAt());
        sessionRepository.save(session);
        return toView(session);
    }

    @Transactional(readOnly = true)
    public SessionPage listMine(long userId, Long cursor, Integer size) {
        int s = size == null || size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        Slice<ClimbingSession> slice = sessionRepository.searchMine(userId, cursor, PageRequest.of(0, s));
        List<SessionView> items = slice.getContent().stream().map(SessionService::toView).toList();
        Long nextCursor = slice.hasNext() && !slice.getContent().isEmpty()
                ? slice.getContent().get(slice.getContent().size() - 1).getId()
                : null;
        return new SessionPage(items, nextCursor, s);
    }

    @Transactional(readOnly = true)
    public SessionView getOwn(long userId, String extId) {
        ClimbingSession session = fetchOwnedNotDeleted(userId, extId);
        return toView(session);
    }

    @Transactional
    public SessionView update(long userId, String extId, UpdateSessionCommand cmd) {
        ClimbingSession session = fetchOwnedNotDeleted(userId, extId);
        if (cmd.endedAt() != null && session.getStartedAt() != null
                && cmd.endedAt().isBefore(session.getStartedAt())) {
            throw new SessionException("SESSION_INVALID", "endedAt must be after startedAt");
        }
        if (cmd.condition() != null && (cmd.condition() < 1 || cmd.condition() > 5)) {
            throw new SessionException("SESSION_INVALID", "condition must be between 1 and 5");
        }
        if (cmd.note() != null) session.updateNote(cmd.note());
        if (cmd.condition() != null) session.updateCondition(cmd.condition());
        if (cmd.endedAt() != null) session.close(cmd.endedAt());
        return toView(session);
    }

    @Transactional
    public void softDelete(long userId, String extId) {
        ClimbingSession session = fetchOwnedNotDeleted(userId, extId);
        session.softDelete();
    }

    private ClimbingSession fetchOwnedNotDeleted(long userId, String extId) {
        ClimbingSession session = sessionRepository.findByExtId(extId)
                .orElseThrow(() -> new SessionException("SESSION_NOT_FOUND", "Session " + extId + " not found"));
        if (session.isDeleted()) {
            throw new SessionException("SESSION_NOT_FOUND", "Session " + extId + " not found");
        }
        if (session.getUserId() == null || session.getUserId() != userId) {
            // 타 유저 세션 접근은 존재 자체를 숨기기 위해 404 동일 응답
            throw new SessionException("SESSION_NOT_FOUND", "Session " + extId + " not found");
        }
        return session;
    }

    private static SessionView toView(ClimbingSession s) {
        return new SessionView(
                s.getExtId(),
                s.getGymId(),
                s.getGymNameRaw(),
                s.getStartedAt(),
                s.getEndedAt(),
                s.getDurationMin(),
                s.getNote(),
                s.getCondition()
        );
    }

    public record SessionPage(List<SessionView> items, Long nextCursor, int size) {}
}
