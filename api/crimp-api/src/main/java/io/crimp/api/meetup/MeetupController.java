package io.crimp.api.meetup;

import io.crimp.api.security.CrimpPrincipal;
import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.domain.crew.CreateCrewMeetupCommand;
import io.crimp.domain.crew.CrewException;
import io.crimp.domain.crew.CrewMeetupView;
import io.crimp.domain.crew.CrewService;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/meetups")
@Profile("!test")
@Tag(name = "Meetups", description = "독립 모임 탐색과 생성")
public class MeetupController {

    private final CrewService crewService;

    public MeetupController(CrewService crewService) {
        this.crewService = crewService;
    }

    @Operation(summary = "모임 목록", description = "크루 소속 여부와 관계없이 예정 모임을 조회한다.")
    @GetMapping
    public MeetupListResponse list(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @RequestParam(required = false) Integer size) {
        return new MeetupListResponse(crewService.listAllMeetups(principal.userId(), size).stream()
                .map(MeetupItem::of)
                .toList());
    }

    @Operation(summary = "모임 생성", description = "인증 사용자가 독립 모임 또는 특정 크루 모임을 생성한다.")
    @PostMapping
    public MeetupItem create(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @Valid @RequestBody CreateMeetupRequest req) {
        return MeetupItem.of(crewService.createMeetup(principal.userId(), req.crewExtId(), req.toCommand()));
    }

    @ExceptionHandler(CrewException.class)
    public ResponseEntity<ApiResponse<Void>> handleCrew(CrewException e) {
        HttpStatus status = switch (e.code()) {
            case "CREW_NOT_FOUND", "CREW_HOME_GYM_NOT_FOUND", "CREW_JOIN_REQUEST_NOT_FOUND",
                    "CREW_MEMBER_NOT_FOUND", "CREW_IMAGE_MEDIA_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "CREW_FORBIDDEN", "CREW_IMAGE_MEDIA_FORBIDDEN" -> HttpStatus.FORBIDDEN;
            case "CREW_NAME_TAKEN", "CREW_LIMIT_EXCEEDED", "CREW_ALREADY_MEMBER",
                    "CREW_JOIN_REQUEST_PENDING", "CREW_CAPACITY_FULL" -> HttpStatus.CONFLICT;
            case "CREW_OWNER_LEAVE_BLOCKED" -> HttpStatus.UNPROCESSABLE_ENTITY;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).body(ApiResponse.failure(ErrorBody.of(e.code(), e.getMessage())));
    }

    public record CreateMeetupRequest(
            @Size(min = 2, max = 60) String title,
            @Size(max = 500) String description,
            Instant startsAt,
            Instant endsAt,
            @Size(min = 26, max = 26) String crewExtId,
            @Size(min = 26, max = 26) String gymExtId,
            @Size(max = 100) String location,
            @Min(2) @Max(200) Integer capacity
    ) {
        CreateCrewMeetupCommand toCommand() {
            return new CreateCrewMeetupCommand(title, description, startsAt, endsAt, gymExtId, location, capacity);
        }
    }

    public record MeetupListResponse(List<MeetupItem> items) {}

    public record MeetupItem(
            String extId,
            String title,
            String description,
            Instant startsAt,
            Instant endsAt,
            String crewExtId,
            String crewName,
            String gymExtId,
            String gymName,
            String location,
            Integer capacity,
            Instant createdAt
    ) {
        static MeetupItem of(CrewMeetupView v) {
            return new MeetupItem(v.extId(), v.title(), v.description(), v.startsAt(), v.endsAt(),
                    v.crewExtId(), v.crewName(), v.gymExtId(), v.gymName(), v.location(), v.capacity(), v.createdAt());
        }
    }
}
