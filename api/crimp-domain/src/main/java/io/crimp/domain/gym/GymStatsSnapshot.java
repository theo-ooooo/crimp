package io.crimp.domain.gym;

import java.math.BigDecimal;

/**
 * GymView 에 주입되는 통계 스냅샷.
 */
public record GymStatsSnapshot(
        BigDecimal rating,
        long sendCount,
        long monthlyUserCount
) {
    public static GymStatsSnapshot empty() {
        return new GymStatsSnapshot(null, 0L, 0L);
    }
}
