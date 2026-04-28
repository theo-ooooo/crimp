package io.crimp.core.entity.gym;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 암장 동기화 (`GymSyncService.apply`) 의 결과 1건을 영구 기록하는 감사 로그.
 *
 * <p>diff 입력(예정 삽입·갱신)과 apply 결과(실제 적용)를 함께 기록해, PR #84/#85 와 같은
 * 회귀(예: updated 카운트 vs 실 DB UPDATE 어긋남) 를 사후 추적 가능하게 한다.
 *
 * <p>append-only — 별도 update/delete 시나리오 없음. 따라서 {@code BaseEntity} 의
 * updated_at 을 두지 않고 {@code occurred_at} 단일 시각만 보관.
 */
@Entity
@Getter
@Table(name = "gym_sync_log")
@NoArgsConstructor(access = PROTECTED)
public class GymSyncLog {

    public enum Status {
        APPLIED,
        ABORTED_RATIO_GUARD,
        FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private Status status;

    @Column(name = "lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(name = "lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal lng;

    @Column(name = "radius_m", nullable = false)
    private Integer radiusM;

    @Column(name = "remote_count", nullable = false)
    private Integer remoteCount;

    @Column(name = "current_count", nullable = false)
    private Integer currentCount;

    @Column(name = "additions_planned", nullable = false)
    private Integer additionsPlanned;

    @Column(name = "updates_planned", nullable = false)
    private Integer updatesPlanned;

    @Column(name = "missing_count", nullable = false)
    private Integer missingCount;

    @Column(name = "inserted", nullable = false)
    private Integer inserted;

    @Column(name = "updated", nullable = false)
    private Integer updated;

    @Column(name = "update_skipped", nullable = false)
    private Integer updateSkipped;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    private GymSyncLog(Status status, Instant occurredAt,
                       BigDecimal lat, BigDecimal lng, int radiusM,
                       int remoteCount, int currentCount,
                       int additionsPlanned, int updatesPlanned, int missingCount,
                       int inserted, int updated, int updateSkipped,
                       String errorMessage) {
        this.status = status;
        this.occurredAt = occurredAt;
        this.lat = lat;
        this.lng = lng;
        this.radiusM = radiusM;
        this.remoteCount = remoteCount;
        this.currentCount = currentCount;
        this.additionsPlanned = additionsPlanned;
        this.updatesPlanned = updatesPlanned;
        this.missingCount = missingCount;
        this.inserted = inserted;
        this.updated = updated;
        this.updateSkipped = updateSkipped;
        this.errorMessage = errorMessage;
    }

    public static GymSyncLog applied(Instant occurredAt,
                                     BigDecimal lat, BigDecimal lng, int radiusM,
                                     int remoteCount, int currentCount,
                                     int additionsPlanned, int updatesPlanned, int missingCount,
                                     int inserted, int updated, int updateSkipped) {
        return new GymSyncLog(Status.APPLIED, occurredAt, lat, lng, radiusM,
                remoteCount, currentCount, additionsPlanned, updatesPlanned, missingCount,
                inserted, updated, updateSkipped, null);
    }

    public static GymSyncLog abortedByRatioGuard(Instant occurredAt,
                                                 BigDecimal lat, BigDecimal lng, int radiusM,
                                                 int remoteCount, int currentCount,
                                                 int additionsPlanned, int updatesPlanned, int missingCount,
                                                 String message) {
        return new GymSyncLog(Status.ABORTED_RATIO_GUARD, occurredAt, lat, lng, radiusM,
                remoteCount, currentCount, additionsPlanned, updatesPlanned, missingCount,
                0, 0, 0, message);
    }

    public static GymSyncLog failed(Instant occurredAt,
                                    BigDecimal lat, BigDecimal lng, int radiusM,
                                    int remoteCount, int currentCount,
                                    int additionsPlanned, int updatesPlanned, int missingCount,
                                    int inserted, int updated, int updateSkipped,
                                    String errorMessage) {
        return new GymSyncLog(Status.FAILED, occurredAt, lat, lng, radiusM,
                remoteCount, currentCount, additionsPlanned, updatesPlanned, missingCount,
                inserted, updated, updateSkipped, errorMessage);
    }
}
