package io.crimp.api.log;

import io.crimp.api.security.CrimpPrincipal;
import io.crimp.common.response.ErrorResponse;
import io.crimp.domain.log.SessionException;
import io.crimp.domain.log.SessionService;
import io.crimp.domain.log.SessionView;
import io.crimp.domain.log.StartSessionCommand;
import io.crimp.domain.log.UpdateSessionCommand;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@Profile("!test")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping("/sessions")
    public SessionResponse start(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @RequestBody @Valid StartSessionRequest req) {
        var view = sessionService.start(
                principal.userId(),
                new StartSessionCommand(req.gymId(), req.gymNameRaw(), req.startedAt()));
        return SessionResponse.of(view);
    }

    @GetMapping("/me/sessions")
    public SessionListResponse listMine(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @RequestParam(required = false) Long cursor,
            @RequestParam(required = false) Integer size) {
        var result = sessionService.listMine(principal.userId(), cursor, size);
        List<SessionResponse> items = result.items().stream().map(SessionResponse::of).toList();
        return new SessionListResponse(items, new Page(result.nextCursor(), result.size()));
    }

    @GetMapping("/sessions/{extId}")
    public SessionResponse detail(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId) {
        return SessionResponse.of(sessionService.getOwn(principal.userId(), extId));
    }

    @PatchMapping("/sessions/{extId}")
    public SessionResponse update(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId,
            @RequestBody @Valid UpdateSessionRequest req) {
        var view = sessionService.update(
                principal.userId(),
                extId,
                new UpdateSessionCommand(req.endedAt(), req.note(), req.condition()));
        return SessionResponse.of(view);
    }

    @DeleteMapping("/sessions/{extId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId) {
        sessionService.softDelete(principal.userId(), extId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(SessionException.class)
    public ResponseEntity<ErrorResponse> handle(SessionException e) {
        int status = switch (e.code()) {
            case "SESSION_NOT_FOUND" -> 404;
            case "SESSION_INVALID" -> 400;
            default -> 400;
        };
        return ResponseEntity.status(status).body(ErrorResponse.of(e.code(), e.getMessage()));
    }

    // --- DTOs ---

    public record StartSessionRequest(
            Long gymId,
            @Size(max = 100) String gymNameRaw,
            Instant startedAt
    ) {}

    public record UpdateSessionRequest(
            Instant endedAt,
            @Size(max = 500) String note,
            Byte condition
    ) {}

    public record SessionResponse(
            String extId,
            Long gymId,
            String gymNameRaw,
            Instant startedAt,
            Instant endedAt,
            Short durationMin,
            String note,
            Byte condition
    ) {
        static SessionResponse of(SessionView v) {
            return new SessionResponse(
                    v.extId(), v.gymId(), v.gymNameRaw(),
                    v.startedAt(), v.endedAt(), v.durationMin(), v.note(), v.condition());
        }
    }

    public record SessionListResponse(List<SessionResponse> data, Page page) {}

    public record Page(Long nextCursor, int size) {}
}
