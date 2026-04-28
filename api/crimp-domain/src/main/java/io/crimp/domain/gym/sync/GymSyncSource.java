package io.crimp.domain.gym.sync;

import java.math.BigDecimal;
import java.util.List;

/**
 * 외부 위치 검색 어댑터의 도메인 포트. {@code crimp-infra} 의 구체 구현
 * (예: {@code KakaoLocalGymClient}) 이 본 인터페이스를 만족한다.
 *
 * <p>도메인은 어떤 외부 소스를 쓰는지 알지 못한다 — 다만 "지역(중심 좌표 + 반경) 안의
 * 클라이밍 매장 목록" 을 가져온다. 다중 소스를 합치는 합성 어댑터는 후속 PR.
 */
public interface GymSyncSource {

    /**
     * 주어진 중심 좌표 {@code (lat, lng)} 와 반경 {@code radiusMeters} 안의 클라이밍
     * 관련 매장 목록을 가져온다. 외부 API 의 페이지네이션은 어댑터가 흡수해 단일 list 로
     * 반환. 결과는 외부 소스의 자연 순서를 유지한다 (도메인 측에서 이름·브랜드 기준 정규화).
     *
     * @param lat 중심 위도
     * @param lng 중심 경도
     * @param radiusMeters 검색 반경 (미터)
     * @return 매장 목록 — 비어있을 수 있음. 외부 호출 실패는 RuntimeException 으로 전파.
     */
    List<RemoteGym> fetchByRadius(BigDecimal lat, BigDecimal lng, int radiusMeters);
}
