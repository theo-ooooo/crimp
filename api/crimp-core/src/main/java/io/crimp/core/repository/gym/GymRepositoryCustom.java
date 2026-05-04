package io.crimp.core.repository.gym;

import io.crimp.core.entity.gym.Gym;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.util.List;

/**
 * 복잡한 조회는 QueryDSL 로. Spring Data JPA 의 커스텀 리포 패턴에 따라
 * 인터페이스 이름은 {Entity}Repository + "Custom".
 */
public interface GymRepositoryCustom {
    Slice<Gym> search(Long cursorId, String keyword, String brand, Pageable pageable);

    /**
     * 거리 정렬용 — 키워드/브랜드 필터만 적용하고 모든 active gym 행을 반환.
     * 호출자 (GymService) 가 java haversine 으로 정렬 후 size 만큼 자른다.
     * 베타 데이터 (수십~수백 gym) 에 충분; 후속에 ST_Distance_Sphere + spatial index.
     */
    List<Gym> searchAllForDistance(String keyword, String brand);
}
