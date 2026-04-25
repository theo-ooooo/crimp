package io.crimp.domain.log;

import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.entity.log.ClimbingSession;
import io.crimp.core.entity.log.SessionAttempt;
import io.crimp.core.repository.log.ClimbingSessionRepository;
import io.crimp.core.repository.log.SessionAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttemptServiceTest {

    private ClimbingSessionRepository sessionRepo;
    private SessionAttemptRepository attemptRepo;
    private AttemptService service;

    @BeforeEach
    void setUp() {
        sessionRepo = mock(ClimbingSessionRepository.class);
        attemptRepo = mock(SessionAttemptRepository.class);
        service = new AttemptService(sessionRepo, attemptRepo);
    }

    @Test
    void log_creates_attempt_under_owned_session() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        when(attemptRepo.save(any(SessionAttempt.class))).thenAnswer(i -> i.getArgument(0));

        var cmd = new LogAttemptCommand(
                null, 7L, "V3", new java.math.BigDecimal("3.0"),
                AttemptResult.SEND, 2, null, "메모", null,
                Instant.parse("2026-04-20T10:30:00Z"));
        var view = service.log(42L, "01HSESS", cmd);

        assertThat(view.extId()).hasSize(26);
        assertThat(view.result()).isEqualTo(AttemptResult.SEND);
        assertThat(view.attempts()).isEqualTo(2);
        assertThat(view.gradeValue()).isEqualTo("V3");
        verify(attemptRepo).save(any(SessionAttempt.class));
    }

    @Test
    void log_requires_result() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        var cmd = new LogAttemptCommand(null, null, null, null, null, null, null, null, null, null);
        assertThatThrownBy(() -> service.log(42L, "01HSESS", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("ATTEMPT_INVALID"));
    }

    @Test
    void log_rejects_attempts_below_one() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        var cmd = new LogAttemptCommand(null, null, null, null, AttemptResult.TRY, 0, null, null, null, null);
        assertThatThrownBy(() -> service.log(42L, "01HSESS", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("ATTEMPT_INVALID"));
    }

    @Test
    void log_rejects_attempts_above_max() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        var cmd = new LogAttemptCommand(null, null, null, null, AttemptResult.TRY, 40000, null, null, null, null);
        assertThatThrownBy(() -> service.log(42L, "01HSESS", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("ATTEMPT_INVALID"));
    }

    @Test
    void log_foreign_session_is_404() {
        ClimbingSession s = session(100L, "01HSESS", 99L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        var cmd = new LogAttemptCommand(null, null, null, null, AttemptResult.SEND, 1, null, null, null, null);
        assertThatThrownBy(() -> service.log(42L, "01HSESS", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("SESSION_NOT_FOUND"));
    }

    @Test
    void list_returns_attempts_ordered_by_loggedAt() {
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(sessionRepo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        SessionAttempt a1 = attempt(1L, "01HATT01", 100L, AttemptResult.TRY);
        SessionAttempt a2 = attempt(2L, "01HATT02", 100L, AttemptResult.SEND);
        when(attemptRepo.findBySessionIdOrderByLoggedAt(100L)).thenReturn(List.of(a1, a2));

        var items = service.listBySession(42L, "01HSESS");
        assertThat(items).extracting(AttemptView::extId).containsExactly("01HATT01", "01HATT02");
    }

    @Test
    void update_foreign_session_is_404() {
        SessionAttempt a = attempt(1L, "01HATT", 100L, AttemptResult.TRY);
        ClimbingSession s = session(100L, "01HSESS", 99L, false);
        when(attemptRepo.findByExtId("01HATT")).thenReturn(Optional.of(a));
        when(sessionRepo.findById(100L)).thenReturn(Optional.of(s));

        var cmd = new UpdateAttemptCommand(null, null, null, null, AttemptResult.SEND, null, null, null, null);
        assertThatThrownBy(() -> service.update(42L, "01HATT", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("ATTEMPT_NOT_FOUND"));
    }

    @Test
    void update_partial_fields_applied() {
        SessionAttempt a = attempt(1L, "01HATT", 100L, AttemptResult.TRY);
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(attemptRepo.findByExtId("01HATT")).thenReturn(Optional.of(a));
        when(sessionRepo.findById(100L)).thenReturn(Optional.of(s));

        var cmd = new UpdateAttemptCommand(
                5L, null, "V4", null,
                AttemptResult.SEND, 3, null, "업데이트", null);
        var view = service.update(42L, "01HATT", cmd);
        assertThat(view.result()).isEqualTo(AttemptResult.SEND);
        assertThat(view.attempts()).isEqualTo(3);
        assertThat(view.gradeValue()).isEqualTo("V4");
        assertThat(view.note()).isEqualTo("업데이트");
    }

    @Test
    void delete_owned_attempt() {
        SessionAttempt a = attempt(1L, "01HATT", 100L, AttemptResult.TRY);
        ClimbingSession s = session(100L, "01HSESS", 42L, false);
        when(attemptRepo.findByExtId("01HATT")).thenReturn(Optional.of(a));
        when(sessionRepo.findById(100L)).thenReturn(Optional.of(s));

        service.delete(42L, "01HATT");
        verify(attemptRepo).delete(a);
    }

    // --- helpers ---

    private static ClimbingSession session(long id, String extId, long userId, boolean deleted) {
        ClimbingSession cs = ClimbingSession.start(extId, userId, null, null, Instant.parse("2026-04-20T10:00:00Z"));
        setField(cs, "id", id);
        if (deleted) cs.softDelete();
        return cs;
    }

    private static SessionAttempt attempt(long id, String extId, long sessionId, AttemptResult result) {
        SessionAttempt a = SessionAttempt.log(extId, sessionId, null, result, 1, Instant.parse("2026-04-20T10:30:00Z"));
        setField(a, "id", id);
        return a;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Class<?> c = target.getClass();
            while (c != null) {
                try {
                    Field f = c.getDeclaredField(name);
                    f.setAccessible(true);
                    f.set(target, value);
                    return;
                } catch (NoSuchFieldException e) {
                    c = c.getSuperclass();
                }
            }
            throw new IllegalStateException("no field: " + name);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
