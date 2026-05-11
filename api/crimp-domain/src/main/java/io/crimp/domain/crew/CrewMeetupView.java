package io.crimp.domain.crew;

import java.time.Instant;

public record CrewMeetupView(
        String extId,
        String title,
        String description,
        Instant startsAt,
        Instant endsAt,
        String crewExtId,
        String crewName,
        String gymExtId,
        String gymName,
        String location,
        Integer capacity,
        String joinPolicy,
        Integer participantCount,
        String myParticipation,
        MeetupHostView host,
        boolean canManage,
        Instant createdAt
) {}
