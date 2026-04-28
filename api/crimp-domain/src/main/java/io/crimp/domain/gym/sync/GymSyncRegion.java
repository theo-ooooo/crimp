package io.crimp.domain.gym.sync;

import java.math.BigDecimal;

/**
 * 동기화 호출 대상 영역 (좌표·반경) — grid scan 시 N 개를 묶어 batch 호출.
 *
 * <p>{@code label} 은 운영 로그·응답에 표시되는 사람이 읽기 쉬운 이름 (예: "강남구").
 * audit 로그에는 좌표·반경이 기록되므로 {@code label} 은 보조 정보.
 */
public record GymSyncRegion(
        String label,
        BigDecimal lat,
        BigDecimal lng,
        int radiusMeters
) {
}
