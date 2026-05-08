package io.crimp.core.repository.crew;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

public interface CrewMemberRepositoryCustom {
    Slice<CrewMemberRow> searchActiveByCrew(Long crewId, Long cursorUserId, Pageable pageable);
}
