package io.crimp.api.crew;

import io.crimp.api.security.CrimpPrincipal;
import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.domain.crew.CrewException;
import io.crimp.domain.crew.CrewHomeGymView;
import io.crimp.domain.crew.CrewOwnerView;
import io.crimp.domain.crew.CrewService;
import io.crimp.domain.crew.CrewView;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/crews")
@Profile("!test")
public class CrewController {

    private final CrewService crewService;

    public CrewController(CrewService crewService) {
        this.crewService = crewService;
    }

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

    @GetMapping("/{extId}")
    public CrewDetailResponse detail(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId) {
        return CrewDetailResponse.of(crewService.getByExtId(principal.userId(), extId));
    }

    @ExceptionHandler(CrewException.class)
    public ResponseEntity<ApiResponse<Void>> handleCrew(CrewException e) {
        int status = switch (e.code()) {
            case "CREW_NOT_FOUND" -> 404;
            default -> 400;
        };
        return ResponseEntity.status(status).body(ApiResponse.failure(ErrorBody.of(e.code(), e.getMessage())));
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
