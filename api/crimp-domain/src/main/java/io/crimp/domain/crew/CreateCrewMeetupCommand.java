package io.crimp.domain.crew;

import java.time.Instant;

public record CreateCrewMeetupCommand(
        String title,
        String description,
        Instant startsAt,
        Instant endsAt,
        String gymExtId,
        String location,
        Integer capacity
) {}
