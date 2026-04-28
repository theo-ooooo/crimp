package io.crimp.api.admin;

import io.crimp.api.admin.AdminGymSyncController.ApplyResponse;
import io.crimp.api.admin.AdminGymSyncController.DryRunResponse;
import io.crimp.api.admin.AdminGymSyncController.SyncMode;
import io.crimp.api.admin.AdminGymSyncController.SyncRequest;
import io.crimp.common.response.ApiResponse;
import io.crimp.domain.gym.sync.DryRunResult;
import io.crimp.domain.gym.sync.GymSyncDiff;
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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
}
