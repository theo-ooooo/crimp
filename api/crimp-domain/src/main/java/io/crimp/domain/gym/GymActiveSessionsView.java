package io.crimp.domain.gym;

import java.util.List;

/**
 * 암장 현재 운동중 현황 뷰.
 *
 * <p>activeUsers 는 현재 활성 세션에 참여 중인 사용자 수(중복 userId 제외).
 * gradeBuckets 는 UI 막대 차트용 V-scale 고정 구간.
 */
public record GymActiveSessionsView(
        long activeUsers,
        List<GradeBucket> gradeBuckets
) {
    public record GradeBucket(String grade, long count) {
        public GradeBucket {
            if (grade == null || grade.isBlank()) {
                throw new IllegalArgumentException("grade is required");
            }
        }
    }

    public static GymActiveSessionsView empty() {
        return new GymActiveSessionsView(0L, List.of(
                new GradeBucket("V0", 0L),
                new GradeBucket("V1", 0L),
                new GradeBucket("V2", 0L),
                new GradeBucket("V3", 0L),
                new GradeBucket("V4", 0L),
                new GradeBucket("V5", 0L),
                new GradeBucket("V6", 0L),
                new GradeBucket("V7", 0L),
                new GradeBucket("V8+", 0L)
        ));
    }
}
