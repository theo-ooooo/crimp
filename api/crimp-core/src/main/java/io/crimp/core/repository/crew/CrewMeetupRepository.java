package io.crimp.core.repository.crew;

import io.crimp.core.entity.crew.CrewMeetup;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CrewMeetupRepository extends JpaRepository<CrewMeetup, Long> {
    Optional<CrewMeetup> findByExtIdAndDeletedAtIsNull(String extId);

    List<CrewMeetup> findByCrewIdAndDeletedAtIsNullAndStartsAtGreaterThanEqualOrderByStartsAtAscIdAsc(
            Long crewId, Instant startsAt, Pageable pageable);

    List<CrewMeetup> findByDeletedAtIsNullAndStartsAtGreaterThanEqualOrderByStartsAtAscIdAsc(
            Instant startsAt, Pageable pageable);
}
