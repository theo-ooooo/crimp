package io.crimp.core.repository.crew;

import io.crimp.core.entity.crew.CrewMember;
import io.crimp.core.entity.enums.CrewMemberRole;
import io.crimp.core.entity.enums.CrewMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CrewMemberRepository extends JpaRepository<CrewMember, CrewMember.Id>, CrewMemberRepositoryCustom {
    Optional<CrewMember> findByCrewIdAndUserIdAndStatus(Long crewId, Long userId, CrewMemberStatus status);

    Optional<CrewMember> findByCrewIdAndUserId(Long crewId, Long userId);

    List<CrewMember> findAllByUserIdAndStatus(Long userId, CrewMemberStatus status);

    @Query("select distinct m.crewId from CrewMember m where m.userId = :userId and m.status = :status")
    List<Long> findCrewIdsByUserIdAndStatus(@Param("userId") Long userId, @Param("status") CrewMemberStatus status);

    boolean existsByCrewIdAndUserIdAndStatus(Long crewId, Long userId, CrewMemberStatus status);

    long countByCrewIdAndStatus(Long crewId, CrewMemberStatus status);

    long countByCrewIdAndRoleAndStatus(Long crewId, CrewMemberRole role, CrewMemberStatus status);
}
