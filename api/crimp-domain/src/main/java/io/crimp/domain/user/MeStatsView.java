package io.crimp.domain.user;

import java.time.LocalDate;

/**
 * 홈 대시보드용 사용자 집계 뷰 DTO.
 * weekRange 는 컨트롤러 레이어에서 nested 객체로 변환한다.
 */
public record MeStatsView(
        int weekSessions,
        int weekSends,
        long totalSessions,
        long totalSends,
        String topGrade,
        LocalDate weekStart,
        LocalDate weekEnd
) {}
