package io.crimp.api.admin;

import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.domain.gym.sync.DryRunResult;
import io.crimp.domain.gym.sync.GymSyncDiff;
import io.crimp.domain.gym.sync.GymSyncService;
import io.crimp.domain.gym.sync.RemoteGym;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

/**
 * 운영자 전용 암장 동기화 트리거 (PRD §12 1-3, Phase 1.5).
 *
 * <p>{@code SecurityConfig} 가 {@code /api/v1/admin/**} 를 {@code hasRole("ADMIN")} 으로 차단 —
 * JWT 의 {@code role} claim 이 {@code ADMIN} 인 사용자만 접근 가능. 일반 사용자는 403.
 *
 * <p>요청 본문의 {@code apply=false} (기본) 면 dry-run 결과만 반환, {@code true} 면 dry-run +
 * 본 트랜잭션 내 apply 까지 수행해 {@link GymSyncService.ApplyReport} 반환.
 */
@RestController
@RequestMapping("/api/v1/admin/gyms")
@Profile("!test")
public class AdminGymSyncController {

    private final GymSyncService gymSyncService;

    public AdminGymSyncController(GymSyncService gymSyncService) {
        this.gymSyncService = gymSyncService;
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<?>> sync(@Valid @RequestBody SyncRequest req) {
        boolean apply = Boolean.TRUE.equals(req.apply());
        DryRunResult dry = gymSyncService.dryRun(req.lat(), req.lng(), req.radiusMeters());

        if (!apply) {
            return ResponseEntity.ok(ApiResponse.success(SyncResponse.dryRun(dry)));
        }

        GymSyncService.ApplyReport report = gymSyncService.apply(dry);
        // ABORTED_RATIO_GUARD 는 422 — 입력 자체는 valid 하지만 도메인 안전장치가 거부.
        if (report.status() == GymSyncService.ApplyReport.Status.ABORTED_RATIO_GUARD) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(ApiResponse.failure(ErrorBody.of("GYM_SYNC_ABORTED", report.reason())));
        }
        return ResponseEntity.ok(ApiResponse.success(SyncResponse.applied(dry, report)));
    }

    /**
     * 동기화 요청 본문.
     *
     * @param lat 대상 영역 중심 위도 (-90~90)
     * @param lng 대상 영역 중심 경도 (-180~180)
     * @param radiusMeters 반경 — Kakao Local 상한 20000(20km) 이하
     * @param apply true 면 실제 적용, false/null 이면 dry-run 만
     */
    public record SyncRequest(
            @NotNull
            @DecimalMin(value = "-90", inclusive = true)
            @DecimalMax(value = "90", inclusive = true)
            BigDecimal lat,
            @NotNull
            @DecimalMin(value = "-180", inclusive = true)
            @DecimalMax(value = "180", inclusive = true)
            BigDecimal lng,
            @NotNull
            @Min(100)
            @Max(20000)
            Integer radiusMeters,
            Boolean apply
    ) {}

    /**
     * 동기화 응답. dry-run 만 한 경우 {@code report} 가 null, apply 까지 수행한 경우 둘 다 채워짐.
     *
     * <p>도메인 엔티티(`Gym`) 는 직접 노출하지 않고 {@link UpdateView}/{@link MissingView} 로 매핑.
     */
    public record SyncResponse(
            int remoteCount,
            BigDecimal lat,
            BigDecimal lng,
            int radiusMeters,
            List<RemoteGym> additions,
            List<UpdateView> updates,
            List<MissingView> missingFromRemote,
            ApplyView report
    ) {

        static SyncResponse dryRun(DryRunResult dry) {
            return new SyncResponse(
                    dry.diff().remoteCount(),
                    dry.lat(),
                    dry.lng(),
                    dry.radiusMeters(),
                    dry.diff().additions(),
                    dry.diff().updates().stream().map(UpdateView::of).toList(),
                    dry.diff().missingFromRemote().stream().map(MissingView::of).toList(),
                    null);
        }

        static SyncResponse applied(DryRunResult dry, GymSyncService.ApplyReport report) {
            return new SyncResponse(
                    dry.diff().remoteCount(),
                    dry.lat(),
                    dry.lng(),
                    dry.radiusMeters(),
                    dry.diff().additions(),
                    dry.diff().updates().stream().map(UpdateView::of).toList(),
                    dry.diff().missingFromRemote().stream().map(MissingView::of).toList(),
                    ApplyView.of(report));
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

    public record ApplyView(String status, int inserted, int updated, int updateSkipped,
                            int missingFromRemote, String reason) {
        static ApplyView of(GymSyncService.ApplyReport r) {
            return new ApplyView(r.status().name(), r.inserted(), r.updated(),
                    r.updateSkipped(), r.missingFromRemote(), r.reason());
        }
    }
}
