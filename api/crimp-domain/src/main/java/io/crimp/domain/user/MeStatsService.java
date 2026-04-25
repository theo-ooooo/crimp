package io.crimp.domain.user;

import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.repository.log.ClimbingSessionRepository;
import io.crimp.core.repository.log.SessionAttemptRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

/**
 * 홈 대시보드용 사용자 집계 서비스.
 * 주간 경계는 ISO 8601 (월요일 시작) 을 UTC 기준으로 계산한다.
 * Clock 주입은 단위 테스트 결정성 확보를 위해 분리.
 */
@Service
@Profile("!test")
public class MeStatsService {

    private static final List<AttemptResult> SEND_RESULTS =
            List.of(AttemptResult.SEND, AttemptResult.FLASH, AttemptResult.ONSIGHT);

    private final ClimbingSessionRepository sessionRepository;
    private final SessionAttemptRepository attemptRepository;
    private final Clock clock;

    public MeStatsService(
            ClimbingSessionRepository sessionRepository,
            SessionAttemptRepository attemptRepository) {
        this(sessionRepository, attemptRepository, Clock.systemUTC());
    }

    /** 테스트용: 고정 Clock 주입. */
    public MeStatsService(
            ClimbingSessionRepository sessionRepository,
            SessionAttemptRepository attemptRepository,
            Clock clock) {
        this.sessionRepository = sessionRepository;
        this.attemptRepository = attemptRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public MeStatsView getStats(long userId) {
        ZonedDateTime nowUtc = ZonedDateTime.now(clock.withZone(ZoneOffset.UTC));
        LocalDate weekStart = nowUtc.toLocalDate()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);
        Instant weekFrom = weekStart.atStartOfDay(ZoneOffset.UTC).toInstant();
        // 주 종료는 일요일 23:59:59.999999999 UTC 까지 포함
        Instant weekTo = weekEnd.atTime(23, 59, 59, 999_999_999)
                .toInstant(ZoneOffset.UTC);

        long totalSessions = sessionRepository.countByUserIdAndDeletedAtIsNull(userId);
        long weekSessions = sessionRepository
                .countByUserIdAndDeletedAtIsNullAndStartedAtBetween(userId, weekFrom, weekTo);

        long totalSends = attemptRepository.countSendsByUserId(userId, SEND_RESULTS);
        long weekSends = attemptRepository
                .countSendsByUserIdAndLoggedAtBetween(userId, SEND_RESULTS, weekFrom, weekTo);

        String topGradeValue = attemptRepository
                .findTopGradeValueByUserId(userId, SEND_RESULTS)
                .orElse(null);

        return new MeStatsView(
                weekSessions,
                weekSends,
                totalSessions,
                totalSends,
                topGradeValue,
                weekStart,
                weekEnd
        );
    }
}
