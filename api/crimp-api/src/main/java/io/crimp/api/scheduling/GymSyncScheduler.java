package io.crimp.api.scheduling;

import io.crimp.domain.gym.sync.DryRunResult;
import io.crimp.domain.gym.sync.GymSyncGridPreset;
import io.crimp.domain.gym.sync.GymSyncRegion;
import io.crimp.domain.gym.sync.GymSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 암장 동기화 cron 스케줄러 (PR #110, Phase 1.5).
 *
 * <p>{@link AdminGymSyncController} 의 수동 트리거와 동일한 dry-run → apply 흐름을 정기적으로
 * 자동 실행. 외부 소스 (Kakao Local) 의 변경을 시간차 두고 반영해 운영자가 매번 손으로 호출하지
 * 않아도 되도록 한다.
 *
 * <p>흐름 (호출당):
 * <ol>
 *   <li>{@link GymSyncGridPreset#SEOUL_GU} 의 25개 자치구 좌표를 순회</li>
 *   <li>각 좌표에서 {@code dryRun} → {@code apply} 호출</li>
 *   <li>모든 결과는 {@code gym_sync_log} 테이블에 audit 됨 (apply 가 자체 기록)</li>
 *   <li>한 region 의 실패가 다른 region 을 막지 않도록 {@code try-catch} 로 격리</li>
 * </ol>
 *
 * <p>실행 시점: {@code app.gym-sync.scheduler.cron} 으로 설정. 기본값은 매주 월요일 04:00 UTC
 * (한국 13:00 KST) — 최저 트래픽 시간대 + 한 주에 한 번이면 외부 변경 추적 충분.
 *
 * <p>활성 토글: {@code app.gym-sync.scheduler.enabled} 가 false 면 스케줄러 빈은 등록되지만
 * {@link #syncSeoulGyms()} 진입 시 즉시 return — 운영 환경 첫 베타엔 비활성으로 두고 운영자가
 * admin API 로 트리거, 안정화 이후 활성화하는 패턴.
 *
 * <p>{@code @Profile("!test")} 로 단위 테스트 컨텍스트엔 빈 등록 X.
 */
@Component
@Profile("!test")
public class GymSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(GymSyncScheduler.class);

    private final GymSyncService gymSyncService;
    private final GymSyncSchedulerProperties props;

    public GymSyncScheduler(GymSyncService gymSyncService, GymSyncSchedulerProperties props) {
        this.gymSyncService = gymSyncService;
        this.props = props;
    }

    /**
     * SEOUL_GU 프리셋 25개 좌표를 순회하며 동기화. 각 region 은 독립 호출 — 한 곳 실패가
     * 다른 곳을 막지 않도록 격리. apply 자체가 audit row 를 기록하므로 본 메서드는 application
     * 로그만 남긴다.
     */
    @Scheduled(cron = "${app.gym-sync.scheduler.cron:0 0 4 * * MON}",
            zone = "${app.gym-sync.scheduler.zone:UTC}")
    public void syncSeoulGyms() {
        if (!props.enabled()) {
            log.info("[gym-sync-scheduler] disabled by app.gym-sync.scheduler.enabled — skip");
            return;
        }
        log.info("[gym-sync-scheduler] start preset=SEOUL_GU regions={}",
                GymSyncGridPreset.SEOUL_GU.regions().size());
        int ok = 0;
        int failed = 0;
        for (GymSyncRegion region : GymSyncGridPreset.SEOUL_GU.regions()) {
            try {
                DryRunResult dry = gymSyncService.dryRun(region.lat(), region.lng(), region.radiusMeters());
                GymSyncService.ApplyReport report = gymSyncService.apply(dry);
                log.info("[gym-sync-scheduler] region={} status={} inserted={} updated={}",
                        region.label(), report.status(), report.inserted(), report.updated());
                ok++;
            } catch (RuntimeException e) {
                // 한 region 의 외부 호출 실패 / 트랜잭션 실패 → 나머지 region 은 계속.
                log.warn("[gym-sync-scheduler] region={} failed: {}", region.label(), e.getMessage(), e);
                failed++;
            }
        }
        log.info("[gym-sync-scheduler] done ok={} failed={}", ok, failed);
    }

    /**
     * 스케줄러 활성 여부 + cron 설정. 환경 변수 / application.yml 의 {@code app.gym-sync.scheduler}
     * 아래 정의.
     */
    @ConfigurationProperties(prefix = "app.gym-sync.scheduler")
    public record GymSyncSchedulerProperties(boolean enabled) {
    }
}
