package io.crimp.core.entity.log;

import io.crimp.core.base.SoftDeletableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "climbing_sessions")
@NoArgsConstructor(access = PROTECTED)
public class ClimbingSession extends SoftDeletableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, columnDefinition = "char(26)", unique = true, updatable = false)
    private String extId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "gym_id")
    private Long gymId;

    @Column(name = "gym_name_raw", length = 100)
    private String gymNameRaw;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "duration_min")
    private Short durationMin;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "`condition`")
    private Byte condition;

    private ClimbingSession(String extId, Long userId, Long gymId, String gymNameRaw, Instant startedAt) {
        this.extId = extId;
        this.userId = userId;
        this.gymId = gymId;
        this.gymNameRaw = gymNameRaw;
        this.startedAt = startedAt;
    }

    public static ClimbingSession start(
            String extId, Long userId, Long gymId, String gymNameRaw, Instant startedAt) {
        return new ClimbingSession(extId, userId, gymId, gymNameRaw, startedAt);
    }

    public void close(Instant endedAt) {
        this.endedAt = endedAt;
        if (startedAt != null) {
            long minutes = (endedAt.toEpochMilli() - startedAt.toEpochMilli()) / 60_000L;
            this.durationMin = (short) Math.min(minutes, Short.MAX_VALUE);
        }
    }

    public void updateNote(String note) { this.note = note; }
    public void updateCondition(Byte condition) { this.condition = condition; }
}
