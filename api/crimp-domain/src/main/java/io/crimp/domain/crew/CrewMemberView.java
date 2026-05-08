package io.crimp.domain.crew;

import io.crimp.core.entity.enums.CrewMemberRole;

import java.time.Instant;

public record CrewMemberView(
        String crewExtId,
        String userExtId,
        String nickname,
        CrewMemberRole role,
        Instant joinedAt
) {}
