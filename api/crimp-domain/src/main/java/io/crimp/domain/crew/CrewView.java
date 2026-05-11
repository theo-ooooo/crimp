package io.crimp.domain.crew;

import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewStyle;

import java.time.Instant;
import java.util.List;

public record CrewView(
        String extId,
        String name,
        String summary,
        String description,
        String region,
        CrewHomeGymView homeGym,
        Long imageMediaId,
        String imageUrl,
        CrewLevelBand levelBand,
        CrewStyle style,
        int memberCount,
        Integer capacity,
        CrewJoinPolicy joinPolicy,
        String myStatus,
        CrewMeetupView nextMeetup,
        List<CrewMemberView> memberPreview,
        CrewOwnerView owner,
        Instant createdAt
) {}
