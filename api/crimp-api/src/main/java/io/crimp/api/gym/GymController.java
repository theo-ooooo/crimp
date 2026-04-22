package io.crimp.api.gym;

import io.crimp.common.response.ErrorResponse;
import io.crimp.domain.gym.GymException;
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

    public GymController(GymService gymService, RouteService routeService) {
        this.gymService = gymService;
        this.routeService = routeService;
    }

    @GetMapping
    public GymListResponse list(
            @RequestParam(required = false) Long cursor,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) Integer size) {
        var result = gymService.search(cursor, q, brand, size);
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

    @ExceptionHandler(GymException.class)
    public ResponseEntity<ErrorResponse> handleGym(GymException e) {
        int status = switch (e.code()) {
            case "GYM_NOT_FOUND" -> 404;
            default -> 400;
        };
        return ResponseEntity.status(status).body(ErrorResponse.of(e.code(), e.getMessage()));
    }

    // --- DTOs ---

    public record GymListResponse(List<GymItem> data, Page page) {}

    public record Page(Long nextCursor, int size) {}

    public record GymItem(
            String extId,
            String name,
            String brand,
            String address,
            BigDecimal lat,
            BigDecimal lng
    ) {
        static GymItem of(GymView v) {
            return new GymItem(v.extId(), v.name(), v.brand(), v.address(), v.lat(), v.lng());
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
            String featuresJson
    ) {
        static GymDetailResponse of(GymView v) {
            return new GymDetailResponse(
                    v.extId(), v.name(), v.brand(), v.address(), v.lat(), v.lng(),
                    v.phone(), v.openingHoursJson(), v.settingCycleDays(), v.featuresJson()
            );
        }
    }

    public record RouteListResponse(List<RouteItem> data, Page page) {}

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
