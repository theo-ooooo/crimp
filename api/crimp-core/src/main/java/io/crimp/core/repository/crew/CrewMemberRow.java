package io.crimp.core.repository.crew;

import io.crimp.core.entity.enums.CrewMemberRole;
import io.crimp.core.entity.enums.CrewMemberStatus;

import java.time.Instant;

public record CrewMemberRow(
        Long crewId,
        String crewExtId,
        Long userId,
        String userExtId,
        String nickname,
        CrewMemberRole role,
        CrewMemberStatus status,
        Instant joinedAt
) {}
