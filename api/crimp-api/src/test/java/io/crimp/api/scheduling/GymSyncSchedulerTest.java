package io.crimp.api.scheduling;

import io.crimp.domain.gym.sync.DryRunResult;
import io.crimp.domain.gym.sync.GymSyncDiff;
import io.crimp.domain.gym.sync.GymSyncGridPreset;
import io.crimp.domain.gym.sync.GymSyncRateLimitException;
import io.crimp.domain.gym.sync.GymSyncService;
import io.crimp.domain.gym.sync.GymSyncService.ApplyReport;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@link GymSyncScheduler} 단위 테스트 (PR #110 리뷰 I4).
 *
 * <p>Spring 컨텍스트 없이 GymSyncService mock 주입으로 핵심 분기 검증:
 * <ul>
 *   <li>enabled=false → service 호출 0회</li>
 *   <li>한 region throw → 다른 region 진행 (실패 격리)</li>
 *   <li>정상 흐름 → 25 region × (dryRun + apply)</li>
 * </ul>
 *
 * <p>cron 트리거 자체 / Spring scheduling 통합은 본 단위 테스트 범위 외.
 */
class GymSyncSchedulerTest {

    private static final int SEOUL_REGIONS = 25;

    @Test
    void disabled_skipsSyncEntirely() {
        GymSyncService service = mock(GymSyncService.class);
        GymSyncScheduler scheduler = new GymSyncScheduler(service,
                new GymSyncSchedulerProperties(false, "0 0 4 * * MON", "UTC"));

        scheduler.syncSeoulGyms();

        verify(service, never()).dryRun(any(), any(), anyInt());
        verify(service, never()).apply(any());
    }

    @Test
    void enabled_processesAllSeoulRegions() {
        GymSyncService service = mock(GymSyncService.class);
        when(service.dryRun(any(), any(), anyInt())).thenReturn(emptyDryRun());
        when(service.apply(any())).thenReturn(okReport());

        GymSyncScheduler scheduler = new GymSyncScheduler(service,
                new GymSyncSchedulerProperties(true, "0 0 4 * * MON", "UTC"));
        scheduler.syncSeoulGyms();

        // SEOUL_GU 프리셋의 region 수만큼 dryRun + apply 호출.
        int expected = GymSyncGridPreset.SEOUL_GU.regions().size();
        verify(service, times(expected)).dryRun(any(), any(), anyInt());
        verify(service, times(expected)).apply(any());
    }

    @Test
    void oneRegionFailure_doesNotBlockOthers() {
        GymSyncService service = mock(GymSyncService.class);
        // 첫 호출만 throw, 이후는 정상. region 단위 try-catch 가 격리하면 후속 region 은 진행.
        when(service.dryRun(any(), any(), anyInt()))
                .thenThrow(new RuntimeException("boom"))
                .thenReturn(emptyDryRun());
        when(service.apply(any())).thenReturn(okReport());

        GymSyncScheduler scheduler = new GymSyncScheduler(service,
                new GymSyncSchedulerProperties(true, "0 0 4 * * MON", "UTC"));
        // 예외 propagate 안 됨.
        scheduler.syncSeoulGyms();

        // dryRun 은 25번 모두 호출됐어야 함 (첫 호출 throw 후에도 다음 region 진행).
        verify(service, times(SEOUL_REGIONS)).dryRun(any(), any(), anyInt());
        // apply 는 dryRun 성공한 24개에서만.
        verify(service, atLeastOnce()).apply(any());
    }

    @Test
    void rateLimitFailure_stopsRemainingRegions() {
        GymSyncService service = mock(GymSyncService.class);
        when(service.dryRun(any(), any(), anyInt()))
                .thenThrow(new GymSyncRateLimitException("Kakao Local API limit exceeded"))
                .thenReturn(emptyDryRun());

        GymSyncScheduler scheduler = new GymSyncScheduler(service,
                new GymSyncSchedulerProperties(true, "0 0 4 * * MON", "UTC"));
        scheduler.syncSeoulGyms();

        verify(service, times(1)).dryRun(any(), any(), anyInt());
        verify(service, never()).apply(any());
    }

    private static DryRunResult emptyDryRun() {
        GymSyncDiff.Result empty = new GymSyncDiff.Result(0, List.of(), List.of(), List.of());
        return new DryRunResult(BigDecimal.ZERO, BigDecimal.ZERO, 5000, empty);
    }

    private static ApplyReport okReport() {
        return new ApplyReport(ApplyReport.Status.APPLIED, 0, 0, 0, 0, null);
    }
}
