package io.crimp.core.repository.log;

import io.crimp.core.entity.log.ClimbingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface ClimbingSessionRepository
        extends JpaRepository<ClimbingSession, Long>, ClimbingSessionRepositoryCustom {

    Optional<ClimbingSession> findByExtId(String extId);

    /** 본인 소유 + 미삭제 세션 총 개수 (홈 대시보드 lifetime 집계). */
    long countByUserIdAndDeletedAtIsNull(long userId);

    /** 본인 소유 + 미삭제 + startedAt 구간 세션 개수 (주간 집계). */
    long countByUserIdAndDeletedAtIsNullAndStartedAtBetween(long userId, Instant from, Instant to);
}
