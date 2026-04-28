package io.crimp.domain.gym.sync;

import java.math.BigDecimal;

/**
 * {@link GymSyncService#dryRun} 의 결과를 좌표·반경 컨텍스트와 함께 묶은 값 객체.
 *
 * <p>{@link GymSyncService#apply} 가 본 객체를 단일 인자로 받음으로써 호출자가
 * dry-run 시점과 다른 좌표·반경을 실수로 넘기는 것을 컴파일 타임에 차단한다.
 * 또한 audit row 에 기록되는 컨텍스트(좌표/반경) 가 정확히 dry-run 영역과 일치함이
 * 보장됨 (PR #87 리뷰 I2 — scheduler/admin API 도입 직전 회귀 비용 절감).
 */
public record DryRunResult(
        BigDecimal lat,
        BigDecimal lng,
        int radiusMeters,
        GymSyncDiff.Result diff
) {
}
