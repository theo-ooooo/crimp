package io.crimp.api.meetup;

import io.crimp.api.security.CrimpPrincipal;
import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.domain.crew.CreateCrewMeetupCommand;
import io.crimp.domain.crew.CrewException;
import io.crimp.domain.crew.CrewMeetupView;
import io.crimp.domain.crew.CrewService;
import io.crimp.domain.crew.MeetupParticipantView;
import io.crimp.domain.crew.MeetupHostView;
import io.crimp.domain.crew.UpdateCrewMeetupCommand;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
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
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false, defaultValue = "false") boolean near,
            @RequestParam(required = false) BigDecimal lat,
            @RequestParam(required = false) BigDecimal lng,
            @RequestParam(required = false) String levelBand,
            @RequestParam(required = false) String style,
            @RequestParam(required = false, defaultValue = "false") boolean outdoor) {
        return new MeetupListResponse(crewService.listAllMeetups(
                        principal.userId(), size, near, lat, lng, levelBand, style, outdoor).stream()
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

    @Operation(summary = "모임 상세", description = "모임 상세와 내 참여 상태를 조회한다.")
    @GetMapping("/{extId}")
    public MeetupItem detail(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId) {
        return MeetupItem.of(crewService.getMeetup(principal.userId(), extId));
    }

    @Operation(summary = "모임 수정", description = "모임 방장 또는 크루 관리자/크루장이 시작 전 모임 정보를 수정한다.")
    @PatchMapping("/{extId}")
    public MeetupItem update(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId,
            @Valid @RequestBody UpdateMeetupRequest req) {
        return MeetupItem.of(crewService.updateMeetup(principal.userId(), extId, req.toCommand()));
    }

    @Operation(summary = "모임 참여", description = "바로참여 모임은 참여 완료, 승인제 모임은 참여 요청으로 처리한다.")
    @PostMapping("/{extId}/participants/me")
    public MeetupItem join(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId,
            @RequestBody(required = false) JoinMeetupRequest req) {
        return MeetupItem.of(crewService.joinMeetup(principal.userId(), extId, req == null ? null : req.message()));
    }

    @Operation(summary = "모임 참여 취소", description = "내 모임 참여 또는 참여 요청을 취소한다.")
    @DeleteMapping("/{extId}/participants/me")
    public MeetupItem leave(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId) {
        return MeetupItem.of(crewService.leaveMeetup(principal.userId(), extId));
    }

    @Operation(summary = "모임 삭제", description = "모임 방장이 모임을 삭제한다.")
    @DeleteMapping("/{extId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId) {
        crewService.deleteMeetup(principal.userId(), extId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "모임 참여자 목록", description = "ACTIVE 참여자 목록을 조회한다. PENDING 요청 목록은 모임 관리자만 조회한다.")
    @GetMapping("/{extId}/participants")
    public MeetupParticipantListResponse participants(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId,
            @RequestParam(required = false) String status) {
        return new MeetupParticipantListResponse(crewService
                .listMeetupParticipants(principal.userId(), extId, status)
                .stream()
                .map(MeetupParticipantItem::of)
                .toList());
    }

    @Operation(summary = "모임 참여 요청 승인", description = "모임 관리자가 승인제 모임의 참여 요청을 승인한다.")
    @PostMapping("/{extId}/participants/{userExtId}:approve")
    public MeetupParticipantItem approveParticipant(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId,
            @PathVariable String userExtId) {
        return MeetupParticipantItem.of(crewService.approveMeetupParticipant(principal.userId(), extId, userExtId));
    }

    @Operation(summary = "모임 참여 요청 거절", description = "모임 관리자가 승인제 모임의 참여 요청을 거절한다.")
    @PostMapping("/{extId}/participants/{userExtId}:reject")
    public MeetupParticipantItem rejectParticipant(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId,
            @PathVariable String userExtId) {
        return MeetupParticipantItem.of(crewService.rejectMeetupParticipant(principal.userId(), extId, userExtId));
    }

    @ExceptionHandler(CrewException.class)
    public ResponseEntity<ApiResponse<Void>> handleCrew(CrewException e) {
        HttpStatus status = switch (e.code()) {
            case "CREW_NOT_FOUND", "CREW_HOME_GYM_NOT_FOUND", "CREW_JOIN_REQUEST_NOT_FOUND",
                    "CREW_MEMBER_NOT_FOUND", "CREW_IMAGE_MEDIA_NOT_FOUND",
                    "MEETUP_NOT_FOUND", "MEETUP_PARTICIPANT_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "CREW_FORBIDDEN", "CREW_IMAGE_MEDIA_FORBIDDEN", "MEETUP_FORBIDDEN" -> HttpStatus.FORBIDDEN;
            case "CREW_NAME_TAKEN", "CREW_LIMIT_EXCEEDED", "CREW_ALREADY_MEMBER",
                    "CREW_JOIN_REQUEST_PENDING", "CREW_CAPACITY_FULL", "MEETUP_CAPACITY_FULL" -> HttpStatus.CONFLICT;
            case "CREW_OWNER_LEAVE_BLOCKED", "MEETUP_CLOSED" -> HttpStatus.UNPROCESSABLE_ENTITY;
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
            boolean outdoor,
            @Min(2) @Max(200) Integer capacity,
            String joinPolicy
    ) {
        CreateCrewMeetupCommand toCommand() {
            return new CreateCrewMeetupCommand(title, description, startsAt, endsAt, gymExtId, location, outdoor,
                    capacity, joinPolicy);
        }
    }

    public record UpdateMeetupRequest(
            @Size(min = 2, max = 60) String title,
            @Size(max = 500) String description,
            Instant startsAt,
            Instant endsAt,
            @Size(min = 26, max = 26) String gymExtId,
            @Size(max = 100) String location,
            Boolean outdoor,
            @Min(2) @Max(200) Integer capacity,
            String joinPolicy
    ) {
        UpdateCrewMeetupCommand toCommand() {
            return new UpdateCrewMeetupCommand(title, description, startsAt, endsAt, gymExtId, location, outdoor,
                    capacity, joinPolicy);
        }
    }

    public record JoinMeetupRequest(@Size(max = 500) String message) {}

    public record MeetupListResponse(List<MeetupItem> items) {}

    public record MeetupParticipantListResponse(List<MeetupParticipantItem> items) {}

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
            boolean outdoor,
            Integer capacity,
            String joinPolicy,
            Integer participantCount,
            String myParticipation,
            MeetupHost host,
            boolean canManage,
            Instant createdAt
    ) {
        static MeetupItem of(CrewMeetupView v) {
            return new MeetupItem(v.extId(), v.title(), v.description(), v.startsAt(), v.endsAt(),
                    v.crewExtId(), v.crewName(), v.gymExtId(), v.gymName(), v.location(), v.outdoor(),
                    v.capacity(), v.joinPolicy(), v.participantCount(), v.myParticipation(),
                    MeetupHost.of(v.host()), v.canManage(), v.createdAt());
        }
    }

    public record MeetupHost(String extId, String nickname) {
        static MeetupHost of(MeetupHostView v) {
            return v == null ? null : new MeetupHost(v.extId(), v.nickname());
        }
    }

    public record MeetupParticipantItem(
            String userExtId,
            String nickname,
            String status,
            String message,
            Instant joinedAt
    ) {
        static MeetupParticipantItem of(MeetupParticipantView v) {
            return new MeetupParticipantItem(v.userExtId(), v.nickname(), v.status(), v.message(), v.joinedAt());
        }
    }
}
