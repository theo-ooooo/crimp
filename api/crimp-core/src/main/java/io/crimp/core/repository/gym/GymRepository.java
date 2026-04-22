package io.crimp.core.repository.gym;

import io.crimp.core.entity.gym.Gym;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface GymRepository extends JpaRepository<Gym, Long> {

    Optional<Gym> findByExtId(String extId);

    /**
     * 커서 기반 검색. 정렬: id 내림차순 (최신 생성 우선).
     * 키워드·브랜드는 optional. null 이면 해당 필터 skip.
     */
    @Query("""
           SELECT g FROM Gym g
            WHERE (:cursorId IS NULL OR g.id < :cursorId)
              AND (:keyword IS NULL OR g.name LIKE CONCAT('%', :keyword, '%'))
              AND (:brand IS NULL OR g.brand = :brand)
            ORDER BY g.id DESC
           """)
    Slice<Gym> search(
            @Param("cursorId") Long cursorId,
            @Param("keyword") String keyword,
            @Param("brand") String brand,
            Pageable pageable);
}
