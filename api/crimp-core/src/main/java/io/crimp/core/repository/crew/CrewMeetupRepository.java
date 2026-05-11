package io.crimp.core.repository.crew;

import io.crimp.core.entity.crew.CrewMeetup;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CrewMeetupRepository extends JpaRepository<CrewMeetup, Long> {
    List<CrewMeetup> findByCrewIdAndDeletedAtIsNullOrderByStartsAtAscIdAsc(Long crewId, Pageable pageable);

    List<CrewMeetup> findByDeletedAtIsNullOrderByStartsAtAscIdAsc(Pageable pageable);
}
