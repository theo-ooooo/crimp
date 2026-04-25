package io.crimp.api.user;

import io.crimp.api.security.CrimpPrincipal;
import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.common.time.AppTimeZone;
import io.crimp.domain.user.MeStatsService;
import io.crimp.domain.user.MeStatsView;
import io.crimp.domain.user.ProfileView;
import io.crimp.domain.user.UpdateProfileCommand;
import io.crimp.domain.user.UserException;
import io.crimp.domain.user.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1")
@Profile("!test")
public class UserController {

    private final UserService userService;
    private final MeStatsService meStatsService;

    public UserController(UserService userService, MeStatsService meStatsService) {
        this.userService = userService;
        this.meStatsService = meStatsService;
    }

    @GetMapping("/me")
    public MeResponse getMe(@AuthenticationPrincipal CrimpPrincipal principal) {
        return MeResponse.of(userService.getMe(principal.userId()));
    }

    @PatchMapping("/me/profile")
    public MeResponse updateMyProfile(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @RequestBody @Valid UpdateProfileRequest req) {
        UpdateProfileCommand cmd = new UpdateProfileCommand(
                req.nickname(), req.bio(), req.levelSelf(), req.mainGymId(), req.avatarMediaId());
        return MeResponse.of(userService.updateMyProfile(principal.userId(), cmd));
    }

    @GetMapping("/me/stats")
    public MeStatsResponse myStats(@AuthenticationPrincipal CrimpPrincipal principal) {
        // Phase 1: KST 고정. 사용자 profile 에 timezone 필드 추가 시 User 엔티티에서 읽어 전달 (F1).
        return MeStatsResponse.of(
                meStatsService.getStats(principal.userId(), AppTimeZone.KST));
    }

    @GetMapping("/users/{extId}")
    public PublicUserResponse getPublic(@PathVariable String extId) {
        return PublicUserResponse.of(userService.getPublicProfile(extId));
    }

    @ExceptionHandler(UserException.class)
    public ResponseEntity<ApiResponse<Void>> handleUser(UserException e) {
        int status = switch (e.code()) {
            case "USER_NOT_FOUND", "PROFILE_MISSING" -> 404;
            case "NICKNAME_TAKEN" -> 409;
            default -> 400;
        };
        return ResponseEntity.status(status).body(ApiResponse.failure(ErrorBody.of(e.code(), e.getMessage())));
    }

    // --- DTOs ---

    public record UpdateProfileRequest(
            @Size(min = 2, max = 30) String nickname,
            @Size(max = 300) String bio,
            Byte levelSelf,
            Long mainGymId,
            Long avatarMediaId
    ) {}

    public record MeResponse(
            String extId,
            String nickname,
            String bio,
            Byte levelSelf,
            Long mainGymId,
            Long avatarMediaId
    ) {
        static MeResponse of(ProfileView v) {
            return new MeResponse(v.extId(), v.nickname(), v.bio(), v.levelSelf(), v.mainGymId(), v.avatarMediaId());
        }
    }

    public record PublicUserResponse(
            String extId,
            String nickname,
            String bio,
            Byte levelSelf,
            Long avatarMediaId
    ) {
        static PublicUserResponse of(ProfileView v) {
            // 공개 프로필은 mainGymId 제외 (프라이버시: 다른 유저에게 본인 주 암장 노출 여부는 Phase 1.5 설정으로)
            return new PublicUserResponse(v.extId(), v.nickname(), v.bio(), v.levelSelf(), v.avatarMediaId());
        }
    }

    /**
     * 홈 대시보드 집계 응답.
     * weekRange 는 도메인 뷰의 평면 필드(weekStart/weekEnd)를 nested 구조로 변환.
     */
    public record MeStatsResponse(
            long weekSessions,
            long weekSends,
            long totalSessions,
            long totalSends,
            String topGrade,
            WeekRange weekRange
    ) {
        static MeStatsResponse of(MeStatsView v) {
            return new MeStatsResponse(
                    v.weekSessions(),
                    v.weekSends(),
                    v.totalSessions(),
                    v.totalSends(),
                    v.topGrade(),
                    new WeekRange(v.weekStart(), v.weekEnd())
            );
        }
    }

    public record WeekRange(LocalDate start, LocalDate end) {}
}
