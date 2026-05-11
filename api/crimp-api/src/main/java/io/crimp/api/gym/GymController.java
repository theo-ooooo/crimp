package io.crimp.api.gym;

import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.domain.gym.GymActiveSessionsService;
import io.crimp.domain.gym.GymException;
import io.crimp.domain.gym.GymActiveSessionsView;
import io.crimp.domain.gym.GymRecentActivityService;
import io.crimp.domain.gym.GymService;
import io.crimp.domain.gym.GymView;
import io.crimp.domain.gym.RouteService;
import io.crimp.domain.gym.RouteView;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/gyms")
@Profile("!test")
public class GymController {

    private final GymService gymService;
    private final RouteService routeService;
    private final GymRecentActivityService recentActivityService;
    private final GymActiveSessionsService activeSessionsService;

    public GymController(GymService gymService, RouteService routeService,
                         GymRecentActivityService recentActivityService,
                         GymActiveSessionsService activeSessionsService) {
        this.gymService = gymService;
        this.routeService = routeService;
        this.recentActivityService = recentActivityService;
        this.activeSessionsService = activeSessionsService;
    }

    /**
     * gym 검색.
     *
     * <p>query parameters:
     * <ul>
     *   <li>{@code q} — 이름 부분 일치 (선택)</li>
     *   <li>{@code brand} — canonical 브랜드 (선택)</li>
     *   <li>{@code lat}, {@code lng} — 둘 다 주어지면 거리(haversine) 정렬, 응답에 distanceMeters 포함.
     *       이 모드에선 cursor 페이지네이션 비활성 (size 만큼만 반환, nextCursor=null).</li>
     *   <li>{@code cursor} — 거리 모드가 아닐 때 id DESC 페이지네이션</li>
     *   <li>{@code size} — 페이지 크기 (기본 20, 최대 50)</li>
     * </ul>
     */
    @GetMapping
    public GymListResponse list(
            @RequestParam(required = false) Long cursor,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Integer size) {
        var result = gymService.search(cursor, q, brand, size, lat, lng);
        List<GymItem> items = result.items().stream().map(GymItem::of).toList();
        return new GymListResponse(items, new Page(result.nextCursor(), result.size()));
    }

    @GetMapping("/{extId}")
    public GymDetailResponse detail(@PathVariable String extId) {
        return GymDetailResponse.of(gymService.getByExtId(extId));
    }

    /**
     * 암장의 활성 루트 목록 조회. id DESC (최근 세팅 우선), 커서 페이지네이션.
     *
     * 인증 자체는 SecurityConfig 의 /api/v1/gyms/&#42;/routes 매처가 강제한다.
     */
    @GetMapping("/{gymExtId}/routes")
    public RouteListResponse listRoutes(
            @PathVariable String gymExtId,
            @RequestParam(required = false) Long cursor,
            @RequestParam(required = false) Integer size) {
        var result = routeService.listByGym(gymExtId, cursor, size);
        List<RouteItem> items = result.items().stream().map(RouteItem::of).toList();
        return new RouteListResponse(items, new Page(result.nextCursor(), result.pageSize()));
    }

    /**
     * 암장 최근 활동 조회. 커서 페이지네이션 없이 최신순 N건만 반환.
     */
    @GetMapping("/{gymExtId}/recent-activity")
    public RecentActivityResponse recentActivity(
            @PathVariable String gymExtId,
            @RequestParam(required = false) Integer size) {
        List<RecentActivityItem> items = recentActivityService.list(gymExtId, size).stream()
                .map(RecentActivityItem::of)
                .toList();
        return new RecentActivityResponse(items);
    }

    /**
     * 암장 현재 운동중 현황 조회. active user 수 + 그레이드 분포만 반환.
     */
    @GetMapping("/{gymExtId}/active-sessions")
    public ActiveSessionsResponse activeSessions(@PathVariable String gymExtId) {
        return ActiveSessionsResponse.of(activeSessionsService.get(gymExtId));
    }

    @ExceptionHandler(GymException.class)
    public ResponseEntity<ApiResponse<Void>> handleGym(GymException e) {
        int status = switch (e.code()) {
            case "GYM_NOT_FOUND" -> 404;
            default -> 400;
        };
        return ResponseEntity.status(status).body(ApiResponse.failure(ErrorBody.of(e.code(), e.getMessage())));
    }

    // --- DTOs ---

    public record GymListResponse(List<GymItem> items, Page page) {}

    public record Page(Long nextCursor, int size) {}

    public record GymItem(
            String extId,
            String name,
            String brand,
            String address,
            BigDecimal lat,
            BigDecimal lng,
            BigDecimal rating,
            long sendCount,
            long monthlyUserCount,
            Double distanceMeters
    ) {
        static GymItem of(GymView v) {
            return new GymItem(v.extId(), v.name(), v.brand(), v.address(), v.lat(), v.lng(),
                    v.rating(), v.sendCount(), v.monthlyUserCount(), v.distanceMeters());
        }
    }

    public record GymDetailResponse(
            String extId,
            String name,
            String brand,
            String address,
            BigDecimal lat,
            BigDecimal lng,
            String phone,
            String openingHoursJson,
            Integer settingCycleDays,
            String featuresJson,
            BigDecimal rating,
            long sendCount,
            long monthlyUserCount
    ) {
        static GymDetailResponse of(GymView v) {
            return new GymDetailResponse(
                    v.extId(), v.name(), v.brand(), v.address(), v.lat(), v.lng(),
                    v.phone(), v.openingHoursJson(), v.settingCycleDays(), v.featuresJson(),
                    v.rating(), v.sendCount(), v.monthlyUserCount()
            );
        }
    }

    public record RouteListResponse(List<RouteItem> items, Page page) {}

    public record RecentActivityResponse(List<RecentActivityItem> items) {}

    public record RecentActivityItem(
            String userExtId,
            String nickname,
            int avatarColorHue,
            String gradeValue,
            AttemptResult result,
            java.time.Instant loggedAt
    ) {
        static RecentActivityItem of(io.crimp.domain.gym.GymRecentActivityView v) {
            return new RecentActivityItem(
                    v.userExtId(),
                    v.nickname(),
                    v.avatarColorHue(),
                    v.gradeValue(),
                    v.result(),
                    v.loggedAt());
        }
    }

    public record ActiveSessionsResponse(
            long activeUsers,
            List<GradeBucket> gradeBuckets
    ) {
        static ActiveSessionsResponse of(GymActiveSessionsView v) {
            return new ActiveSessionsResponse(
                    v.activeUsers(),
                    v.gradeBuckets().stream().map(GradeBucket::of).toList());
        }
    }

    public record GradeBucket(String grade, long count) {
        static GradeBucket of(GymActiveSessionsView.GradeBucket v) {
            return new GradeBucket(v.grade(), v.count());
        }
    }

    public record RouteItem(
            String extId,
            String name,
            String color,
            String gradeScale,
            String gradeValue,
            BigDecimal gradeNumeric,
            String setter,
            LocalDate setAt
    ) {
        static RouteItem of(RouteView v) {
            return new RouteItem(
                    v.extId(), v.name(), v.color(), v.gradeScale(), v.gradeValue(),
                    v.gradeNumeric(), v.setter(), v.setAt()
            );
        }
    }
}
