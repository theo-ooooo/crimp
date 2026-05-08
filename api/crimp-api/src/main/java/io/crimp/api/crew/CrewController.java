package io.crimp.api.crew;

import io.crimp.api.security.CrimpPrincipal;
import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.domain.crew.CreateCrewCommand;
import io.crimp.domain.crew.CrewException;
import io.crimp.domain.crew.CrewHomeGymView;
import io.crimp.domain.crew.CrewOwnerView;
import io.crimp.domain.crew.CrewService;
import io.crimp.domain.crew.CrewView;
import io.crimp.domain.crew.UpdateCrewCommand;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/crews")
@Profile("!test")
@Tag(name = "Crews", description = "크루 탐색과 상세 조회 (Phase 1.5)")
public class CrewController {

    private final CrewService crewService;

    public CrewController(CrewService crewService) {
        this.crewService = crewService;
    }

    @Operation(
            summary = "크루 생성",
            description = "인증 사용자가 공개/승인제 크루를 생성한다. 생성자는 OWNER 멤버가 된다."
    )
    @PostMapping
    public CrewDetailResponse create(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @Valid @RequestBody CreateCrewRequest req) {
        return CrewDetailResponse.of(crewService.create(principal.userId(), req.toCommand()));
    }

    @Operation(
            summary = "공개 크루 목록 조회",
            description = "인증 사용자 기준 공개 크루 목록을 커서 페이지네이션으로 조회한다. "
                    + "지역, 대표 암장, 레벨, 스타일 필터를 지원하며 응답에는 myStatus 를 포함한다."
    )
    @GetMapping
    public CrewListResponse list(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @RequestParam(required = false) Long cursor,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String gymExtId,
            @RequestParam(required = false) String levelBand,
            @RequestParam(required = false) String style,
            @RequestParam(required = false) Integer size) {
        var result = crewService.search(principal.userId(), cursor, q, region, gymExtId, levelBand, style, size);
        return new CrewListResponse(
                result.items().stream().map(CrewItem::of).toList(),
                new Page(result.nextCursor(), result.size()));
    }

    @Operation(
            summary = "공개 크루 상세 조회",
            description = "인증 사용자 기준 공개 크루 상세와 대표 암장, owner, myStatus 를 조회한다."
    )
    @GetMapping("/{extId}")
    public CrewDetailResponse detail(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId) {
        return CrewDetailResponse.of(crewService.getByExtId(principal.userId(), extId));
    }

    @Operation(
            summary = "크루 기본 정보 수정",
            description = "OWNER/ADMIN 이 크루 이름, 소개, 대표 암장, 레벨, 스타일, 정원을 수정한다."
    )
    @PatchMapping("/{extId}")
    public CrewDetailResponse update(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId,
            @Valid @RequestBody UpdateCrewRequest req) {
        return CrewDetailResponse.of(crewService.update(principal.userId(), extId, req.toCommand()));
    }

    @ExceptionHandler(CrewException.class)
    public ResponseEntity<ApiResponse<Void>> handleCrew(CrewException e) {
        HttpStatus status = switch (e.code()) {
            case "CREW_NOT_FOUND", "CREW_HOME_GYM_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "CREW_FORBIDDEN" -> HttpStatus.FORBIDDEN;
            case "CREW_NAME_TAKEN", "CREW_LIMIT_EXCEEDED" -> HttpStatus.CONFLICT;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).body(ApiResponse.failure(ErrorBody.of(e.code(), e.getMessage())));
    }

    public record CreateCrewRequest(
            @Size(min = 2, max = 30) String name,
            @Size(max = 120) String summary,
            @Size(max = 500) String description,
            @Size(max = 50) String region,
            @Size(min = 26, max = 26) String homeGymExtId,
            String levelBand,
            String style,
            @Min(2) @Max(200) Integer capacity
    ) {
        CreateCrewCommand toCommand() {
            return new CreateCrewCommand(name, summary, description, region, homeGymExtId,
                    levelBand, style, capacity);
        }
    }

    public record UpdateCrewRequest(
            @Size(min = 2, max = 30) String name,
            @Size(max = 120) String summary,
            @Size(max = 500) String description,
            @Size(max = 50) String region,
            @Size(min = 26, max = 26) String homeGymExtId,
            Boolean clearHomeGym,
            String levelBand,
            String style,
            @Min(2) @Max(200) Integer capacity,
            Boolean clearCapacity
    ) {
        UpdateCrewCommand toCommand() {
            return new UpdateCrewCommand(name, summary, description, region, homeGymExtId,
                    Boolean.TRUE.equals(clearHomeGym), levelBand, style, capacity,
                    Boolean.TRUE.equals(clearCapacity));
        }
    }

    public record CrewListResponse(List<CrewItem> items, Page page) {}

    public record Page(Long nextCursor, int size) {}

    public record CrewItem(
            String extId,
            String name,
            String summary,
            String region,
            HomeGym homeGym,
            CrewLevelBand levelBand,
            CrewStyle style,
            int memberCount,
            Integer capacity,
            CrewJoinPolicy joinPolicy,
            String myStatus
    ) {
        static CrewItem of(CrewView v) {
            return new CrewItem(
                    v.extId(),
                    v.name(),
                    v.summary(),
                    v.region(),
                    HomeGym.of(v.homeGym()),
                    v.levelBand(),
                    v.style(),
                    v.memberCount(),
                    v.capacity(),
                    v.joinPolicy(),
                    v.myStatus());
        }
    }

    public record CrewDetailResponse(
            String extId,
            String name,
            String summary,
            String description,
            String region,
            HomeGym homeGym,
            CrewLevelBand levelBand,
            CrewStyle style,
            int memberCount,
            Integer capacity,
            CrewJoinPolicy joinPolicy,
            String myStatus,
            Owner owner,
            Instant createdAt
    ) {
        static CrewDetailResponse of(CrewView v) {
            return new CrewDetailResponse(
                    v.extId(),
                    v.name(),
                    v.summary(),
                    v.description(),
                    v.region(),
                    HomeGym.of(v.homeGym()),
                    v.levelBand(),
                    v.style(),
                    v.memberCount(),
                    v.capacity(),
                    v.joinPolicy(),
                    v.myStatus(),
                    Owner.of(v.owner()),
                    v.createdAt());
        }
    }

    public record HomeGym(String extId, String name) {
        static HomeGym of(CrewHomeGymView v) {
            return v == null ? null : new HomeGym(v.extId(), v.name());
        }
    }

    public record Owner(String extId, String nickname) {
        static Owner of(CrewOwnerView v) {
            return v == null ? null : new Owner(v.extId(), v.nickname());
        }
    }
}
