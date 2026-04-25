package io.crimp.domain.user;

import java.time.LocalDate;

/**
 * 홈 대시보드용 사용자 집계 뷰 DTO.
 * weekRange 는 컨트롤러 레이어에서 nested 객체로 변환한다.
 *
 * 모든 카운트는 long 으로 통일 — 먼 미래에도 오버플로우 걱정 없음.
 */
public record MeStatsView(
        long weekSessions,
        long weekSends,
        long totalSessions,
        long totalSends,
        String topGrade,
        LocalDate weekStart,
        LocalDate weekEnd
) {}
