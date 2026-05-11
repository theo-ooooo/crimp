package io.crimp.core.repository.crew;

import io.crimp.core.entity.crew.CrewMember;
import io.crimp.core.entity.enums.CrewMemberRole;
import io.crimp.core.entity.enums.CrewMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CrewMemberRepository extends JpaRepository<CrewMember, CrewMember.Id>, CrewMemberRepositoryCustom {
    Optional<CrewMember> findByCrewIdAndUserIdAndStatus(Long crewId, Long userId, CrewMemberStatus status);

    Optional<CrewMember> findByCrewIdAndUserId(Long crewId, Long userId);

    List<CrewMember> findAllByUserIdAndStatus(Long userId, CrewMemberStatus status);

    boolean existsByCrewIdAndUserIdAndStatus(Long crewId, Long userId, CrewMemberStatus status);

    long countByCrewIdAndStatus(Long crewId, CrewMemberStatus status);

    long countByCrewIdAndRoleAndStatus(Long crewId, CrewMemberRole role, CrewMemberStatus status);
}
