package io.crimp.core.repository.crew;

import io.crimp.core.entity.crew.CrewMeetup;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewStyle;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public interface CrewMeetupRepositoryCustom {
    List<CrewMeetup> searchUpcoming(
            Instant now,
            BigDecimal centerLat,
            BigDecimal centerLng,
            CrewLevelBand levelBand,
            CrewStyle style,
            boolean outdoor,
            Pageable pageable);
}
