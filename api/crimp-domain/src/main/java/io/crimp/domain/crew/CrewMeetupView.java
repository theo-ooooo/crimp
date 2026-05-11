package io.crimp.domain.crew;

import java.time.Instant;

public record CrewMeetupView(
        String extId,
        String title,
        String description,
        Instant startsAt,
        Instant endsAt,
        String location,
        Integer capacity,
        Instant createdAt
) {}
