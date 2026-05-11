package io.crimp.core.entity.gym;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

import static lombok.AccessLevel.PROTECTED;

/**
 * 암장 통계 스냅샷.
 *
 * <p>rating 은 현재 리뷰 도메인이 없어 null 로 유지된다. sendCount / monthlyUserCount 는
 * 일배치로 갱신되는 파생값.
 */
@Entity
@Getter
@Table(name = "gym_stats")
@NoArgsConstructor(access = PROTECTED)
public class GymStats {

    @Id
    @Column(name = "gym_id", nullable = false)
    private Long gymId;

    @Column(name = "rating", precision = 2, scale = 1)
    private BigDecimal rating;

    @Column(name = "send_count", nullable = false)
    private Long sendCount;

    @Column(name = "monthly_user_count", nullable = false)
    private Long monthlyUserCount;

    private GymStats(Long gymId) {
        this.gymId = gymId;
        this.sendCount = 0L;
        this.monthlyUserCount = 0L;
    }

    public static GymStats create(Long gymId) {
        return new GymStats(gymId);
    }

    public void update(BigDecimal rating, long sendCount, long monthlyUserCount) {
        this.rating = rating;
        this.sendCount = sendCount;
        this.monthlyUserCount = monthlyUserCount;
    }
}
