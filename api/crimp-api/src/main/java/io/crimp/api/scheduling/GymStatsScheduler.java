package io.crimp.api.scheduling;

import io.crimp.domain.gym.GymStatsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 암장 통계 일배치 스케줄러.
 */
@Component
@Profile("!test")
public class GymStatsScheduler {

    private static final Logger log = LoggerFactory.getLogger(GymStatsScheduler.class);

    private final GymStatsService gymStatsService;
    private final GymStatsSchedulerProperties props;

    public GymStatsScheduler(GymStatsService gymStatsService, GymStatsSchedulerProperties props) {
        this.gymStatsService = gymStatsService;
        this.props = props;
    }

    @Scheduled(cron = "${app.gym-stats.scheduler.cron:0 30 4 * * *}",
            zone = "${app.gym-stats.scheduler.zone:UTC}")
    public void refreshGymStats() {
        if (!props.enabled()) {
            log.info("[gym-stats-scheduler] disabled by app.gym-stats.scheduler.enabled — skip");
            return;
        }
        log.info("[gym-stats-scheduler] start");
        gymStatsService.refreshAll();
        log.info("[gym-stats-scheduler] done");
    }
}
