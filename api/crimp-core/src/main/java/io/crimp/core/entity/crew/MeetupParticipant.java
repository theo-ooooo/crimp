package io.crimp.core.entity.crew;

import io.crimp.core.entity.enums.MeetupParticipantStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "meetup_participants")
@IdClass(MeetupParticipant.Id.class)
@NoArgsConstructor(access = PROTECTED)
public class MeetupParticipant {

    @jakarta.persistence.Id
    @Column(name = "meetup_id", nullable = false)
    private Long meetupId;

    @jakarta.persistence.Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MeetupParticipantStatus status;

    @Column(name = "message", length = 500)
    private String message;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Builder
    private MeetupParticipant(Long meetupId, Long userId, MeetupParticipantStatus status,
                              String message, Instant joinedAt, Instant updatedAt) {
        Instant now = Instant.now();
        this.meetupId = meetupId;
        this.userId = userId;
        this.status = status == null ? MeetupParticipantStatus.ACTIVE : status;
        this.message = message;
        this.joinedAt = joinedAt == null ? now : joinedAt;
        this.updatedAt = updatedAt == null ? this.joinedAt : updatedAt;
    }

    public static MeetupParticipant join(Long meetupId, Long userId, MeetupParticipantStatus status, String message) {
        return new MeetupParticipant(meetupId, userId, status, message, null, null);
    }

    public void reactivate(MeetupParticipantStatus status, String message) {
        Instant now = Instant.now();
        this.status = status;
        this.message = message;
        this.joinedAt = now;
        this.updatedAt = now;
    }

    public void cancel() {
        this.status = MeetupParticipantStatus.CANCELED;
        this.updatedAt = Instant.now();
    }

    public static final class Id implements Serializable {
        private Long meetupId;
        private Long userId;

        public Id() {
        }

        public Id(Long meetupId, Long userId) {
            this.meetupId = meetupId;
            this.userId = userId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Id id)) return false;
            return Objects.equals(meetupId, id.meetupId) && Objects.equals(userId, id.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(meetupId, userId);
        }
    }
}
