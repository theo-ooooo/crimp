package io.crimp.core.entity.crew;

import io.crimp.core.entity.enums.CrewMemberRole;
import io.crimp.core.entity.enums.CrewMemberStatus;
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
@Table(name = "crew_members")
@IdClass(CrewMember.Id.class)
@NoArgsConstructor(access = PROTECTED)
public class CrewMember {

    @jakarta.persistence.Id
    @Column(name = "crew_id", nullable = false)
    private Long crewId;

    @jakarta.persistence.Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private CrewMemberRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CrewMemberStatus status;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Builder
    private CrewMember(Long crewId, Long userId, CrewMemberRole role, CrewMemberStatus status,
                       Instant joinedAt, Instant updatedAt) {
        this.crewId = crewId;
        this.userId = userId;
        this.role = role == null ? CrewMemberRole.MEMBER : role;
        this.status = status == null ? CrewMemberStatus.ACTIVE : status;
        this.joinedAt = joinedAt == null ? Instant.now() : joinedAt;
        this.updatedAt = updatedAt == null ? this.joinedAt : updatedAt;
    }

    public void leave() {
        this.status = CrewMemberStatus.LEFT;
        this.updatedAt = Instant.now();
    }

    public static final class Id implements Serializable {
        private Long crewId;
        private Long userId;

        public Id() {
        }

        public Id(Long crewId, Long userId) {
            this.crewId = crewId;
            this.userId = userId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Id id)) return false;
            return Objects.equals(crewId, id.crewId) && Objects.equals(userId, id.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(crewId, userId);
        }
    }
}
