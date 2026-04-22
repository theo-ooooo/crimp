package io.crimp.domain.log;

import java.time.Instant;

public record StartSessionCommand(
        Long gymId,
        String gymNameRaw,
        Instant startedAt
) {}
