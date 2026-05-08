package io.crimp.core.repository.crew;

import io.crimp.core.entity.enums.CrewJoinRequestStatus;

import java.time.Instant;

public record CrewJoinRequestRow(
        Long id,
        String extId,
        Long crewId,
        String crewExtId,
        Long userId,
        String userExtId,
        String userNickname,
        String message,
        CrewJoinRequestStatus status,
        String decidedByExtId,
        Instant decidedAt,
        Instant createdAt
) {}
