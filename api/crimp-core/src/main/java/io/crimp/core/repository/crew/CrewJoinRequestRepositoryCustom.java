package io.crimp.core.repository.crew;

import io.crimp.core.entity.enums.CrewJoinRequestStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.util.Optional;

public interface CrewJoinRequestRepositoryCustom {
    Slice<CrewJoinRequestRow> searchByCrew(Long crewId, CrewJoinRequestStatus status, Long cursorId,
                                           Pageable pageable);

    Optional<CrewJoinRequestRow> findRowByExtId(String extId);
}
