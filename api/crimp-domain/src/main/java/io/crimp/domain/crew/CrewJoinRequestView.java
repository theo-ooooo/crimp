package io.crimp.domain.crew;

import io.crimp.core.entity.enums.CrewJoinRequestStatus;

import java.time.Instant;

public record CrewJoinRequestView(
        String extId,
        String crewExtId,
        String userExtId,
        String userNickname,
        String message,
        CrewJoinRequestStatus status,
        String decidedBy,
        Instant decidedAt,
        Instant createdAt
) {}
