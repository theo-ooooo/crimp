package io.crimp.api.admin;

import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.domain.gym.sync.DryRunResult;
import io.crimp.domain.gym.sync.GymSyncDiff;
import io.crimp.domain.gym.sync.GymSyncGridPreset;
import io.crimp.domain.gym.sync.GymSyncRegion;
import io.crimp.domain.gym.sync.GymSyncService;
import io.crimp.domain.gym.sync.RemoteGym;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * 운영자 전용 암장 동기화 트리거 (PRD §12 1-3, Phase 1.5).
 *
 * <p>{@code SecurityConfig} 가 {@code /api/v1/admin/**} 를 {@code hasRole("ADMIN")} 으로 차단 —
 * JWT 의 {@code role} claim 이 {@code ADMIN} 인 사용자만 접근 가능. 일반 사용자는 403.
 *
 * <p>{@link SyncRequest#mode} 가 {@link SyncMode#DRY_RUN} 이면 {@link DryRunResponse} 만 반환,
 * {@link SyncMode#APPLY} 면 dry-run + 본 트랜잭션 내 apply 까지 수행해 {@link ApplyResponse} 반환.
 */
@Tag(name = "Admin - Gym Sync", description = "운영자 전용 암장 동기화 트리거 (Kakao Local 등 외부 소스 → DB)")
@RestController
@RequestMapping("/api/v1/admin/gyms")
@Profile("!test")
public class AdminGymSyncController {

    private static final Logger log = LoggerFactory.getLogger(AdminGymSyncController.class);

    private final GymSyncService gymSyncService;

    public AdminGymSyncController(GymSyncService gymSyncService) {
        this.gymSyncService = gymSyncService;
    }

    @Operation(
            summary = "Kakao Local 동기화 트리거",
            description = "DRY_RUN: diff 결과만 반환 (200, DryRunResponse). "
                    + "APPLY: dry-run + apply, 정상이면 200 ApplyResponse, 변경 비율 가드 초과면 422 GYM_SYNC_ABORTED."
    )
    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<?>> sync(@Valid @RequestBody SyncRequest req) {
        DryRunResult dry = gymSyncService.dryRun(req.lat(), req.lng(), req.radiusMeters());

        if (req.mode() == SyncMode.DRY_RUN) {
            return ResponseEntity.ok(ApiResponse.success(DryRunResponse.from(dry)));
        }

        GymSyncService.ApplyReport report = gymSyncService.apply(dry);
        // ABORTED_RATIO_GUARD 는 422 — 입력 자체는 valid 하지만 도메인 안전장치가 거부.
        if (report.status() == GymSyncService.ApplyReport.Status.ABORTED_RATIO_GUARD) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(ApiResponse.failure(ErrorBody.of("GYM_SYNC_ABORTED", report.reason())));
        }
        return ResponseEntity.ok(ApiResponse.success(ApplyResponse.from(dry, report)));
    }

    /**
     * 사전 정의된 grid preset (예: 서울 25개 자치구) 의 모든 영역에 대해 일괄 동기화 (PRD §12 1-4).
     *
     * <p>각 영역(구) 은 독립적으로 dry-run + (mode=APPLY 시) apply 를 수행 — 한 영역의
     * 실패가 다른 영역의 진행을 막지 않는다 (`GymSyncService.apply` 가 자체 트랜잭션을
     * 가지므로 실패 시 해당 영역만 rollback).
     *
     * <p>동일 매장이 여러 영역에서 매칭되어도 diff 의 (이름·주소) 매칭으로 신규 등록 X
     * (idempotent).
     */
    @Operation(
            summary = "Grid preset 동기화 트리거",
            description = "사전 정의된 영역 묶음(예: SEOUL_GU 25개 구) 에 대해 일괄 동기화. "
                    + "각 영역은 독립 트랜잭션 — 한 영역 실패가 다른 영역에 영향 X. "
                    + "응답에는 영역별 결과 배열 + 합계가 포함됨."
    )
    @PostMapping("/sync/grid")
    public ResponseEntity<ApiResponse<GridSyncResponse>> syncGrid(@Valid @RequestBody GridSyncRequest req) {
        List<GymSyncRegion> regions = req.preset().regions();
        List<GridRegionResult> results = new ArrayList<>(regions.size());

        log.info("[admin/gym-sync] grid start preset={} mode={} regions={}",
                req.preset(), req.mode(), regions.size());

        for (GymSyncRegion region : regions) {
            try {
                DryRunResult dry = gymSyncService.dryRun(
                        region.lat(), region.lng(), region.radiusMeters());
                if (req.mode() == SyncMode.DRY_RUN) {
                    results.add(GridRegionResult.dryRun(region, dry));
                    continue;
                }
                GymSyncService.ApplyReport report = gymSyncService.apply(dry);
                results.add(GridRegionResult.applied(region, dry, report));
            } catch (RuntimeException e) {
                // 한 영역의 외부 호출 실패가 다른 영역까지 막지 않도록 — 해당 영역만 FAILED 로 표시.
                log.warn("[admin/gym-sync] grid region failed: label={} lat={} lng={} err={}",
                        region.label(), region.lat(), region.lng(), e.getMessage());
                results.add(GridRegionResult.failed(region, e.getClass().getSimpleName() + ": " + e.getMessage()));
            }
        }

        GridSyncResponse body = GridSyncResponse.of(req.preset(), req.mode(), results);
        GridSummary s = body.summary();
        log.info("[admin/gym-sync] grid done preset={} mode={} applied={} aborted={} failed={} dryRun={} inserted={} updated={}",
                req.preset(), req.mode(),
                s.applied(), s.aborted(), s.failed(), s.dryRun(),
                s.totalInserted(), s.totalUpdated());
        return ResponseEntity.ok(ApiResponse.success(body));
    }

    /** 동기화 모드. */
    public enum SyncMode {
        /** diff 결과만 반환, DB 미수정. */
        DRY_RUN,
        /** dry-run + apply. 변경 비율 가드 초과 시 422. */
        APPLY
    }

    /**
     * 동기화 요청.
     *
     * @param lat 대상 영역 중심 위도 (대한민국 영역)
     * @param lng 대상 영역 중심 경도 (대한민국 영역)
     * @param radiusMeters 반경 — Kakao Local 상한 20000(20km) 이하
     * @param mode {@link SyncMode#DRY_RUN} 또는 {@link SyncMode#APPLY}
     */
    public record SyncRequest(
            @NotNull
            @DecimalMin(value = "33.0", inclusive = true)
            @DecimalMax(value = "39.0", inclusive = true)
            @Schema(description = "검색 중심 위도. Kakao Local 동기화는 대한민국 좌표만 허용한다.",
                    example = "37.5172", minimum = "33.0", maximum = "39.0")
            BigDecimal lat,
            @NotNull
            @DecimalMin(value = "124.0", inclusive = true)
            @DecimalMax(value = "132.0", inclusive = true)
            @Schema(description = "검색 중심 경도. Kakao Local 동기화는 대한민국 좌표만 허용한다.",
                    example = "127.0473", minimum = "124.0", maximum = "132.0")
            BigDecimal lng,
            @NotNull
            @Min(100)
            @Max(20000)
            @Schema(description = "검색 반경(미터). Kakao Local 상한은 20km.",
                    example = "5000", minimum = "100", maximum = "20000")
            Integer radiusMeters,
            @NotNull
            @Schema(example = "DRY_RUN")
            SyncMode mode
    ) {}

    /** {@link SyncMode#DRY_RUN} 응답 — diff 결과만. DB 미수정. */
    public record DryRunResponse(
            BigDecimal lat,
            BigDecimal lng,
            int radiusMeters,
            int remoteCount,
            List<RemoteGym> additions,
            List<UpdateView> updates,
            List<MissingView> missingFromRemote
    ) {
        static DryRunResponse from(DryRunResult dry) {
            return new DryRunResponse(
                    dry.lat(), dry.lng(), dry.radiusMeters(),
                    dry.diff().remoteCount(),
                    dry.diff().additions(),
                    dry.diff().updates().stream().map(UpdateView::of).toList(),
                    dry.diff().missingFromRemote().stream().map(MissingView::of).toList());
        }
    }

    /**
     * {@link SyncMode#APPLY} 응답 — diff 결과 + 실제 적용 카운트.
     * dry-run 의 컨텍스트(additions/updates/missing) 를 그대로 노출해 운영자가 어떤 row 가
     * 영향받았는지 즉시 확인 가능 — audit log (`gym_sync_log`) 와는 별개로 응답에서도 즉시 가시화.
     */
    public record ApplyResponse(
            BigDecimal lat,
            BigDecimal lng,
            int radiusMeters,
            int remoteCount,
            List<RemoteGym> additions,
            List<UpdateView> updates,
            List<MissingView> missingFromRemote,
            int inserted,
            int updated,
            int updateSkipped
    ) {
        static ApplyResponse from(DryRunResult dry, GymSyncService.ApplyReport report) {
            return new ApplyResponse(
                    dry.lat(), dry.lng(), dry.radiusMeters(),
                    dry.diff().remoteCount(),
                    dry.diff().additions(),
                    dry.diff().updates().stream().map(UpdateView::of).toList(),
                    dry.diff().missingFromRemote().stream().map(MissingView::of).toList(),
                    report.inserted(), report.updated(), report.updateSkipped());
        }
    }

    public record UpdateView(long currentId, String currentName, RemoteGym remote) {
        static UpdateView of(GymSyncDiff.UpdateCandidate u) {
            return new UpdateView(u.current().getId(), u.current().getName(), u.remote());
        }
    }

    public record MissingView(long id, String name, String address) {
        static MissingView of(io.crimp.core.entity.gym.Gym g) {
            return new MissingView(g.getId(), g.getName(), g.getAddress());
        }
    }

    /** Grid preset 동기화 요청. */
    public record GridSyncRequest(
            @NotNull GymSyncGridPreset preset,
            @NotNull SyncMode mode
    ) {}

    /** Grid preset 동기화 응답 — 영역별 결과 배열 + 합계. */
    public record GridSyncResponse(
            String preset,
            String mode,
            int regionCount,
            GridSummary summary,
            List<GridRegionResult> results
    ) {
        static GridSyncResponse of(GymSyncGridPreset preset, SyncMode mode, List<GridRegionResult> results) {
            return new GridSyncResponse(preset.name(), mode.name(), results.size(), GridSummary.of(results), results);
        }
    }

    /** 영역 1건의 결과 status (PR #89 리뷰 I2: 매직 String → enum 으로 승격). */
    public enum RegionStatus {
        /** dry-run 만 수행, DB 미수정. */
        DRY_RUN,
        /** apply 까지 정상 수행. */
        APPLIED,
        /** 변경 비율 가드로 차단. {@link GridRegionResult#reason} 에 사유. */
        ABORTED_RATIO_GUARD,
        /** 외부 호출/예외 실패. {@link GridRegionResult#reason} 에 메시지. 다른 영역은 계속 진행. */
        FAILED
    }

    /** Grid 호출의 영역별 합계. */
    public record GridSummary(
            int applied, int aborted, int failed, int dryRun,
            int totalInserted, int totalUpdated, int totalUpdateSkipped,
            int totalAdditionsPlanned, int totalUpdatesPlanned
    ) {
        static GridSummary of(List<GridRegionResult> results) {
            int applied = 0, aborted = 0, failed = 0, dryRun = 0;
            int ins = 0, upd = 0, skip = 0, addPlan = 0, updPlan = 0;
            for (GridRegionResult r : results) {
                switch (r.status()) {
                    case APPLIED -> {
                        applied++;
                        ins += r.inserted();
                        upd += r.updated();
                        skip += r.updateSkipped();
                        addPlan += r.additionsPlanned();
                        updPlan += r.updatesPlanned();
                    }
                    case ABORTED_RATIO_GUARD -> {
                        aborted++;
                        // [PR #89 리뷰 I3] 가드로 막혔어도 "계획되었던 변경량" 은 합계에 포함
                        // — 운영자가 가드 발동 사유를 가늠할 수 있게 (planned vs applied 비교 가능).
                        addPlan += r.additionsPlanned();
                        updPlan += r.updatesPlanned();
                    }
                    case FAILED -> failed++;
                    case DRY_RUN -> {
                        dryRun++;
                        addPlan += r.additionsPlanned();
                        updPlan += r.updatesPlanned();
                    }
                }
            }
            return new GridSummary(applied, aborted, failed, dryRun, ins, upd, skip, addPlan, updPlan);
        }
    }

    /**
     * 영역 1건의 동기화 결과. {@link #status} 별 의미는 {@link RegionStatus} 참조.
     */
    public record GridRegionResult(
            String label,
            BigDecimal lat,
            BigDecimal lng,
            int radiusMeters,
            RegionStatus status,
            int additionsPlanned,
            int updatesPlanned,
            int missingFromRemote,
            int inserted,
            int updated,
            int updateSkipped,
            String reason
    ) {

        static GridRegionResult dryRun(GymSyncRegion r, DryRunResult dry) {
            return new GridRegionResult(
                    r.label(), r.lat(), r.lng(), r.radiusMeters(),
                    RegionStatus.DRY_RUN,
                    dry.diff().additions().size(),
                    dry.diff().updates().size(),
                    dry.diff().missingFromRemote().size(),
                    0, 0, 0, null);
        }

        static GridRegionResult applied(GymSyncRegion r, DryRunResult dry, GymSyncService.ApplyReport report) {
            // ApplyReport.Status 와 RegionStatus 의 이름이 일치 — valueOf 로 바로 매핑.
            // (직접 switch 하면 새 Status 추가 시 즉시 컴파일 에러 — IDE 가 잡아줌. 본 코드는 둘 다
            //  enum 이라 이름 동기화가 끊기면 valueOf 가 throw.)
            RegionStatus rs = RegionStatus.valueOf(report.status().name());
            return new GridRegionResult(
                    r.label(), r.lat(), r.lng(), r.radiusMeters(),
                    rs,
                    dry.diff().additions().size(),
                    dry.diff().updates().size(),
                    dry.diff().missingFromRemote().size(),
                    report.inserted(), report.updated(), report.updateSkipped(),
                    report.reason());
        }

        static GridRegionResult failed(GymSyncRegion r, String message) {
            return new GridRegionResult(
                    r.label(), r.lat(), r.lng(), r.radiusMeters(),
                    RegionStatus.FAILED,
                    0, 0, 0, 0, 0, 0, message);
        }
    }
}
