package io.crimp.domain.log;

import java.time.Instant;

public record SessionView(
        String extId,
        Long gymId,
        String gymNameRaw,
        Instant startedAt,
        Instant endedAt,
        Short durationMin,
        String note,
        Byte condition
) {}
