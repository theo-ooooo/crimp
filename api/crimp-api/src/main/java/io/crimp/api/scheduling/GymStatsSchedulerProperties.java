package io.crimp.api.scheduling;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 암장 통계 스케줄러 설정.
 */
@ConfigurationProperties(prefix = "app.gym-stats.scheduler")
public record GymStatsSchedulerProperties(
        boolean enabled,
        String cron,
        String zone
) {}
