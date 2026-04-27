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
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

/**
 * 홈 대시보드용 사용자 집계 서비스.
 *
 * <p>주간 경계는 ISO 8601 (월요일 시작) 을 **요청 시 주어진 timezone** 기준으로 계산한다.
 * LocalDate (weekStart/End) 는 해당 로케일의 "캘린더 주", 리포에 넘기는 Instant 는 그 로케일의
 * 월요일 00:00:00.000 ~ 일요일 23:59:59.999999999 구간을 UTC Instant 로 환산한 값.
 *
 * <p>Phase 1: 컨트롤러가 {@link AppTimeZone#KST} 를 기본 주입. 사용자 timezone 필드가 생기면
 * 컨트롤러 단에서 User 엔티티로부터 읽어 전달하도록 확장 (F1).
 *
 * <p>Clock 주입은 단위 테스트 결정성 확보를 위해 분리.
 */
@Service
@Profile("!test")
public class MeStatsService {

    private static final List<AttemptResult> SEND_RESULTS =
            List.of(AttemptResult.SEND, AttemptResult.FLASH, AttemptResult.ONSIGHT);

    private final ClimbingSessionRepository sessionRepository;
    private final SessionAttemptRepository attemptRepository;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
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
    public MeStatsView getStats(long userId, ZoneId zone) {
        ZonedDateTime nowInZone = ZonedDateTime.now(clock.withZone(zone));
        LocalDate weekStart = nowInZone.toLocalDate()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);
        // 지정 zone 의 월요일 00:00 → Instant, 일요일 23:59:59.999999999 → Instant.
        Instant weekFrom = weekStart.atStartOfDay(zone).toInstant();
        Instant weekTo = weekEnd.atTime(23, 59, 59, 999_999_999)
                .atZone(zone).toInstant();

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
