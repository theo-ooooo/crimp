package io.crimp.domain.crew;

import java.time.Instant;

public record MeetupParticipantView(
        String userExtId,
        String nickname,
        String status,
        String message,
        Instant joinedAt
) {}
