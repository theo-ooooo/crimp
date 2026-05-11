package io.crimp.core.repository.crew;

import io.crimp.core.entity.crew.MeetupParticipant;
import io.crimp.core.entity.enums.MeetupParticipantStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MeetupParticipantRepository extends JpaRepository<MeetupParticipant, MeetupParticipant.Id> {
    Optional<MeetupParticipant> findByMeetupIdAndUserId(Long meetupId, Long userId);

    List<MeetupParticipant> findByMeetupIdAndStatusInOrderByJoinedAtAscUserIdAsc(
            Long meetupId, Collection<MeetupParticipantStatus> statuses);

    boolean existsByMeetupIdAndUserIdAndStatus(Long meetupId, Long userId, MeetupParticipantStatus status);

    long countByMeetupIdAndStatus(Long meetupId, MeetupParticipantStatus status);
}
