package io.crimp.api.admin;

import io.crimp.api.admin.AdminGymSyncController.ApplyResponse;
import io.crimp.api.admin.AdminGymSyncController.DryRunResponse;
import io.crimp.api.admin.AdminGymSyncController.GridSyncRequest;
import io.crimp.api.admin.AdminGymSyncController.GridSyncResponse;
import io.crimp.api.admin.AdminGymSyncController.SyncMode;
import io.crimp.api.admin.AdminGymSyncController.SyncRequest;
import io.crimp.common.response.ApiResponse;
import io.crimp.domain.gym.sync.DryRunResult;
import io.crimp.domain.gym.sync.GymSyncDiff;
import io.crimp.domain.gym.sync.GymSyncGridPreset;
import io.crimp.domain.gym.sync.GymSyncService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@link AdminGymSyncController} 의 메서드 단위 테스트.
 *
 * <p>{@code @Profile("!test")} 가 붙은 컨트롤러이므로 통합 부트 컨텍스트는 사용하지 않고,
 * mock 으로 주입된 {@link GymSyncService} 와 직접 호출. ROLE_ADMIN 가드 자체는
 * SecurityConfig 단의 책임 — 본 테스트는 컨트롤러 진입 후 동작(dry-run/apply, status 매핑,
 * 응답 타입 분리)을 검증한다.
 */
class AdminGymSyncControllerTest {

    private static final BigDecimal LAT = new BigDecimal("37.5008");
    private static final BigDecimal LNG = new BigDecimal("127.0376");
    private static final int RADIUS = 5000;

    private GymSyncService syncService;
    private AdminGymSyncController controller;

    @BeforeEach
    void setUp() {
        syncService = mock(GymSyncService.class);
        controller = new AdminGymSyncController(syncService);
    }

    @Test
    void dryRun_returns200WithDryRunResponse_andDoesNotCallApply() {
        var diff = new GymSyncDiff.Result(0, List.of(), List.of(), List.of());
        when(syncService.dryRun(eq(LAT), eq(LNG), eq(RADIUS)))
                .thenReturn(new DryRunResult(LAT, LNG, RADIUS, diff));

        ResponseEntity<ApiResponse<?>> res = controller.sync(
                new SyncRequest(LAT, LNG, RADIUS, SyncMode.DRY_RUN));

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().status()).isTrue();
        // 응답 타입이 DryRunResponse 여야 — apply 결과 필드(inserted/updated/updateSkipped) 가 노출되지 않음.
        assertThat(res.getBody().data()).isInstanceOf(DryRunResponse.class);
        verify(syncService, never()).apply(any());
    }

    @Test
    void apply_appliedReturns200WithApplyResponse() {
        var diff = new GymSyncDiff.Result(0, List.of(), List.of(), List.of());
        when(syncService.dryRun(eq(LAT), eq(LNG), eq(RADIUS)))
                .thenReturn(new DryRunResult(LAT, LNG, RADIUS, diff));
        when(syncService.apply(any())).thenReturn(
                GymSyncService.ApplyReport.applied(2, 1, 0, 0));

        ResponseEntity<ApiResponse<?>> res = controller.sync(
                new SyncRequest(LAT, LNG, RADIUS, SyncMode.APPLY));

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().status()).isTrue();
        assertThat(res.getBody().data()).isInstanceOf(ApplyResponse.class);
        ApplyResponse body = (ApplyResponse) res.getBody().data();
        assertThat(body.inserted()).isEqualTo(2);
        assertThat(body.updated()).isEqualTo(1);
        verify(syncService).apply(any());
    }

    @Test
    void apply_abortedReturns422_withErrorEnvelope() {
        var diff = new GymSyncDiff.Result(0, List.of(), List.of(), List.of());
        when(syncService.dryRun(eq(LAT), eq(LNG), eq(RADIUS)))
                .thenReturn(new DryRunResult(LAT, LNG, RADIUS, diff));
        when(syncService.apply(any())).thenReturn(
                GymSyncService.ApplyReport.aborted("change ratio 0.7 exceeds limit 0.5", 0));

        ResponseEntity<ApiResponse<?>> res = controller.sync(
                new SyncRequest(LAT, LNG, RADIUS, SyncMode.APPLY));

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().status()).isFalse();
        assertThat(res.getBody().error().code()).isEqualTo("GYM_SYNC_ABORTED");
        assertThat(res.getBody().error().message()).contains("change ratio");
    }

    @Test
    void grid_dryRun_iteratesAllRegions_andDoesNotCallApply() {
        // SEOUL_GU 의 모든 영역에 대해 dryRun 호출 — apply 는 호출 X.
        when(syncService.dryRun(any(), any(), eq(5000)))
                .thenAnswer(inv -> new DryRunResult(
                        inv.getArgument(0), inv.getArgument(1), 5000,
                        new GymSyncDiff.Result(0, List.of(), List.of(), List.of())));

        ResponseEntity<ApiResponse<GridSyncResponse>> res = controller.syncGrid(
                new GridSyncRequest(GymSyncGridPreset.SEOUL_GU, SyncMode.DRY_RUN));

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().status()).isTrue();
        GridSyncResponse body = res.getBody().data();
        assertThat(body.preset()).isEqualTo("SEOUL_GU");
        assertThat(body.mode()).isEqualTo("DRY_RUN");
        assertThat(body.regionCount()).isEqualTo(25);
        assertThat(body.results()).hasSize(25);
        assertThat(body.summary().dryRun()).isEqualTo(25);
        assertThat(body.summary().applied()).isZero();
        verify(syncService, times(25)).dryRun(any(), any(), eq(5000));
        verify(syncService, never()).apply(any());
    }

    @Test
    void grid_apply_aggregatesAppliedAndAbortedAcrossRegions() {
        when(syncService.dryRun(any(), any(), eq(5000)))
                .thenAnswer(inv -> new DryRunResult(
                        inv.getArgument(0), inv.getArgument(1), 5000,
                        new GymSyncDiff.Result(0, List.of(), List.of(), List.of())));
        // 24 개는 정상 apply, 마지막 1개는 ABORTED — 총 24 inserted (각 1) + 1 aborted.
        var applied = GymSyncService.ApplyReport.applied(1, 0, 0, 0);
        var aborted = GymSyncService.ApplyReport.aborted("change ratio 0.7 exceeds limit 0.5", 0);
        when(syncService.apply(any()))
                .thenReturn(applied, applied, applied, applied, applied, applied, applied, applied,
                        applied, applied, applied, applied, applied, applied, applied, applied,
                        applied, applied, applied, applied, applied, applied, applied, applied,
                        aborted);

        ResponseEntity<ApiResponse<GridSyncResponse>> res = controller.syncGrid(
                new GridSyncRequest(GymSyncGridPreset.SEOUL_GU, SyncMode.APPLY));

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        GridSyncResponse body = res.getBody().data();
        assertThat(body.summary().applied()).isEqualTo(24);
        assertThat(body.summary().aborted()).isEqualTo(1);
        assertThat(body.summary().failed()).isZero();
        assertThat(body.summary().totalInserted()).isEqualTo(24);
        verify(syncService, times(25)).apply(any());
    }

    @Test
    void grid_oneRegionFailure_doesNotBlockOthers() {
        // 첫 호출에서 외부 fetch 실패 → 해당 영역만 FAILED, 나머지는 정상 진행.
        when(syncService.dryRun(any(), any(), eq(5000)))
                .thenThrow(new RuntimeException("kakao temporary outage"))
                .thenAnswer(inv -> new DryRunResult(
                        inv.getArgument(0), inv.getArgument(1), 5000,
                        new GymSyncDiff.Result(0, List.of(), List.of(), List.of())));
        when(syncService.apply(any())).thenReturn(GymSyncService.ApplyReport.applied(0, 0, 0, 0));

        ResponseEntity<ApiResponse<GridSyncResponse>> res = controller.syncGrid(
                new GridSyncRequest(GymSyncGridPreset.SEOUL_GU, SyncMode.APPLY));

        GridSyncResponse body = res.getBody().data();
        assertThat(body.summary().failed()).isEqualTo(1);
        assertThat(body.summary().applied()).isEqualTo(24);
        assertThat(body.results().get(0).status()).isEqualTo("FAILED");
        assertThat(body.results().get(0).reason()).contains("kakao temporary outage");
        verify(syncService, atLeastOnce()).apply(any());
    }
}
