package io.crimp.domain.gym.sync;

import java.math.BigDecimal;

/**
 * 외부 위치 검색 소스(Kakao Local / Naver 등) 가 반환한 단일 매장.
 *
 * <p>본 record 는 {@link GymSyncSource} 와 {@link GymSyncDiff} 사이의 표준 형태로,
 * 어떤 외부 소스를 쓰더라도 동일한 도메인 모양으로 변환 후 비교한다.
 *
 * <p>{@code externalKey} 는 외부 소스의 고유 식별자 (예: Kakao Place ID).
 * 동일 매장이 향후 다른 시드 시점에 다시 들어와도 같은 externalKey 로 매칭되어 중복
 * 삽입을 막는 데 사용 — 다만 현 단계는 `(name, address)` 매칭으로도 충분.
 */
public record RemoteGym(
        String externalKey,
        String name,
        String brand,
        String address,
        BigDecimal lat,
        BigDecimal lng,
        String phone
) {
}
