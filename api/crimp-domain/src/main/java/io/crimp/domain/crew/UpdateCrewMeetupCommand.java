package io.crimp.domain.crew;

import java.time.Instant;

public record UpdateCrewMeetupCommand(
        String title,
        String description,
        Instant startsAt,
        Instant endsAt,
        String gymExtId,
        String location,
        Boolean outdoor,
        Integer capacity,
        String joinPolicy
) {}
