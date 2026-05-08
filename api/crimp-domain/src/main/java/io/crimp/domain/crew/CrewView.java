package io.crimp.domain.crew;

import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewStyle;

import java.time.Instant;

public record CrewView(
        String extId,
        String name,
        String summary,
        String description,
        String region,
        CrewHomeGymView homeGym,
        CrewLevelBand levelBand,
        CrewStyle style,
        int memberCount,
        Integer capacity,
        CrewJoinPolicy joinPolicy,
        String myStatus,
        CrewOwnerView owner,
        Instant createdAt
) {}
