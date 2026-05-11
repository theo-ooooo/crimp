package io.crimp.core.repository.crew;

import io.crimp.core.entity.crew.CrewJoinRequest;
import io.crimp.core.entity.enums.CrewJoinRequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;
import java.util.List;

public interface CrewJoinRequestRepository
        extends JpaRepository<CrewJoinRequest, Long>, CrewJoinRequestRepositoryCustom {
    boolean existsByCrewIdAndUserIdAndStatus(Long crewId, Long userId, CrewJoinRequestStatus status);

    Optional<CrewJoinRequest> findByCrewIdAndUserIdAndStatus(Long crewId, Long userId, CrewJoinRequestStatus status);

    List<CrewJoinRequest> findAllByUserIdAndStatus(Long userId, CrewJoinRequestStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CrewJoinRequest> findByCrewIdAndExtIdAndStatus(Long crewId, String extId, CrewJoinRequestStatus status);
}
