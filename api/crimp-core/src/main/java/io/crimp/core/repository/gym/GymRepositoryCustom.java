package io.crimp.core.repository.gym;

import io.crimp.core.entity.gym.Gym;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

/**
 * 복잡한 조회는 QueryDSL 로. Spring Data JPA 의 커스텀 리포 패턴에 따라
 * 인터페이스 이름은 {Entity}Repository + "Custom".
 */
public interface GymRepositoryCustom {
    Slice<Gym> search(Long cursorId, String keyword, String brand, Pageable pageable);
}
