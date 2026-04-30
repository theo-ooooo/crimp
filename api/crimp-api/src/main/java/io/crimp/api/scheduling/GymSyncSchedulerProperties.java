package io.crimp.api.scheduling;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 암장 동기화 스케줄러 설정 (PR #110, Phase 1.5).
 *
 * <p>{@code app.gym-sync.scheduler} 아래 정의. 환경 변수 매핑:
 * <ul>
 *   <li>{@code GYM_SYNC_SCHEDULER_ENABLED} → enabled</li>
 *   <li>{@code GYM_SYNC_SCHEDULER_CRON} → cron (기본 매주 월 04:00)</li>
 *   <li>{@code GYM_SYNC_SCHEDULER_ZONE} → zone (기본 UTC)</li>
 * </ul>
 *
 * <p>cron / zone 필드는 {@code @Scheduled} placeholder ({@code ${...}}) 가 직접 해석하지만,
 * record 에도 함께 보유해 "이 prefix 의 키는 이 record 가 모두 갖는다" 라는 컨벤션을 유지.
 *
 * <p>코드베이스 컨벤션 — {@code *Properties} 클래스는 별도 top-level 파일 (예: {@code
 * KakaoLocalProperties}, {@code S3Properties}). PR #110 리뷰 I1 으로 분리.
 */
@ConfigurationProperties(prefix = "app.gym-sync.scheduler")
public record GymSyncSchedulerProperties(
        boolean enabled,
        String cron,
        String zone
) {}
