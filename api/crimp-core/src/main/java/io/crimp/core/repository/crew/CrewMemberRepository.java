package io.crimp.core.repository.crew;

import io.crimp.core.entity.crew.CrewMember;
import io.crimp.core.entity.enums.CrewMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CrewMemberRepository extends JpaRepository<CrewMember, CrewMember.Id> {
    Optional<CrewMember> findByCrewIdAndUserIdAndStatus(Long crewId, Long userId, CrewMemberStatus status);

    boolean existsByCrewIdAndUserIdAndStatus(Long crewId, Long userId, CrewMemberStatus status);

    long countByCrewIdAndStatus(Long crewId, CrewMemberStatus status);
}
