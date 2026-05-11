package io.crimp.core.repository.crew;

import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewMemberRole;
import io.crimp.core.entity.enums.CrewMemberStatus;
import io.crimp.core.entity.enums.CrewStyle;

import java.time.Instant;

public record CrewSearchRow(
        Long id,
        String extId,
        String name,
        String summary,
        String description,
        String region,
        Long imageMediaId,
        CrewLevelBand levelBand,
        CrewStyle style,
        CrewJoinPolicy joinPolicy,
        Short capacity,
        Integer memberCount,
        Instant createdAt,
        String homeGymExtId,
        String homeGymName,
        String ownerUserExtId,
        String ownerNickname,
        CrewMemberRole myRole,
        CrewMemberStatus myMemberStatus,
        String pendingRequestExtId
) {}
