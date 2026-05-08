package io.crimp.core.repository.crew;

import io.crimp.core.entity.crew.Crew;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CrewRepository extends JpaRepository<Crew, Long>, CrewRepositoryCustom {
    Optional<Crew> findByExtId(String extId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Crew c where c.extId = :extId")
    Optional<Crew> findByExtIdForUpdate(@Param("extId") String extId);

    boolean existsByName(String name);
    long countByOwnerUserIdAndDeletedAtIsNull(Long ownerUserId);
}
