package io.crimp.domain.log;

import java.time.Instant;

public record UpdateSessionCommand(
        Instant endedAt,
        String note,
        Byte condition
) {}
