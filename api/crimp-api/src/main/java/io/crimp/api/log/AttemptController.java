package io.crimp.api.log;

import io.crimp.api.security.CrimpPrincipal;
import io.crimp.common.response.ErrorResponse;
import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.domain.log.AttemptService;
import io.crimp.domain.log.AttemptView;
import io.crimp.domain.log.LogAttemptCommand;
import io.crimp.domain.log.SessionException;
import io.crimp.domain.log.UpdateAttemptCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@Profile("!test")
public class AttemptController {

    private final AttemptService attemptService;

    public AttemptController(AttemptService attemptService) {
        this.attemptService = attemptService;
    }

    @PostMapping("/sessions/{sessionExtId}/attempts")
    public AttemptResponse log(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String sessionExtId,
            @RequestBody @Valid LogAttemptRequest req) {
        var cmd = new LogAttemptCommand(
                req.routeId(), req.gymId(), req.gradeValue(), req.gradeNumeric(),
                req.result(), req.attempts(), req.mediaId(), req.note(), req.tagsJson(),
                req.loggedAt());
        return AttemptResponse.of(attemptService.log(principal.userId(), sessionExtId, cmd));
    }

    @GetMapping("/sessions/{sessionExtId}/attempts")
    public AttemptListResponse list(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String sessionExtId) {
        List<AttemptView> items = attemptService.listBySession(principal.userId(), sessionExtId);
        return new AttemptListResponse(items.stream().map(AttemptResponse::of).toList());
    }

    @PatchMapping("/attempts/{extId}")
    public AttemptResponse update(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId,
            @RequestBody @Valid UpdateAttemptRequest req) {
        var cmd = new UpdateAttemptCommand(
                req.routeId(), req.gymId(), req.gradeValue(), req.gradeNumeric(),
                req.result(), req.attempts(), req.mediaId(), req.note(), req.tagsJson());
        return AttemptResponse.of(attemptService.update(principal.userId(), extId, cmd));
    }

    @DeleteMapping("/attempts/{extId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId) {
        attemptService.delete(principal.userId(), extId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(SessionException.class)
    public ResponseEntity<ErrorResponse> handle(SessionException e) {
        int status = switch (e.code()) {
            case "SESSION_NOT_FOUND", "ATTEMPT_NOT_FOUND" -> 404;
            case "ATTEMPT_INVALID" -> 400;
            default -> 400;
        };
        return ResponseEntity.status(status).body(ErrorResponse.of(e.code(), e.getMessage()));
    }

    // --- DTOs ---

    public record LogAttemptRequest(
            Long routeId,
            Long gymId,
            @Size(max = 10) String gradeValue,
            BigDecimal gradeNumeric,
            AttemptResult result,
            @Min(1) Integer attempts,
            Long mediaId,
            @Size(max = 300) String note,
            String tagsJson,
            Instant loggedAt
    ) {}

    public record UpdateAttemptRequest(
            Long routeId,
            Long gymId,
            @Size(max = 10) String gradeValue,
            BigDecimal gradeNumeric,
            AttemptResult result,
            @Min(1) Integer attempts,
            Long mediaId,
            @Size(max = 300) String note,
            String tagsJson
    ) {}

    public record AttemptResponse(
            String extId,
            Long routeId,
            Long gymId,
            String gradeValue,
            BigDecimal gradeNumeric,
            AttemptResult result,
            int attempts,
            Long mediaId,
            String note,
            String tagsJson,
            Instant loggedAt
    ) {
        static AttemptResponse of(AttemptView v) {
            return new AttemptResponse(
                    v.extId(), v.routeId(), v.gymId(), v.gradeValue(), v.gradeNumeric(),
                    v.result(), v.attempts(), v.mediaId(), v.note(), v.tagsJson(), v.loggedAt());
        }
    }

    public record AttemptListResponse(List<AttemptResponse> data) {}
}
