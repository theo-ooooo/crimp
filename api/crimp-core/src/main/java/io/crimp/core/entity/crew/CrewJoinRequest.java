package io.crimp.core.entity.crew;

import io.crimp.core.base.BaseEntity;
import io.crimp.core.entity.enums.CrewJoinRequestStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "crew_join_requests")
@NoArgsConstructor(access = PROTECTED)
public class CrewJoinRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, columnDefinition = "char(26)", unique = true, updatable = false)
    private String extId;

    @Column(name = "crew_id", nullable = false)
    private Long crewId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "message", length = 500)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CrewJoinRequestStatus status;

    @Column(name = "decided_by")
    private Long decidedBy;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Builder
    private CrewJoinRequest(String extId, Long crewId, Long userId, String message,
                            CrewJoinRequestStatus status, Long decidedBy, Instant decidedAt) {
        this.extId = extId;
        this.crewId = crewId;
        this.userId = userId;
        this.message = message;
        this.status = status == null ? CrewJoinRequestStatus.PENDING : status;
        this.decidedBy = decidedBy;
        this.decidedAt = decidedAt;
    }

    public void approve(Long decidedBy) {
        this.status = CrewJoinRequestStatus.APPROVED;
        this.decidedBy = decidedBy;
        this.decidedAt = Instant.now();
    }

    public void reject(Long decidedBy) {
        this.status = CrewJoinRequestStatus.REJECTED;
        this.decidedBy = decidedBy;
        this.decidedAt = Instant.now();
    }

    public void cancel(Long decidedBy) {
        this.status = CrewJoinRequestStatus.CANCELED;
        this.decidedBy = decidedBy;
        this.decidedAt = Instant.now();
    }
}
