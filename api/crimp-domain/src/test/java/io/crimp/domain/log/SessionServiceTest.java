package io.crimp.domain.log;

import io.crimp.core.entity.log.ClimbingSession;
import io.crimp.core.repository.log.ClimbingSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SessionServiceTest {

    private ClimbingSessionRepository repo;
    private SessionService service;

    @BeforeEach
    void setUp() {
        repo = mock(ClimbingSessionRepository.class);
        service = new SessionService(repo);
    }

    @Test
    void start_persists_and_returns_view() {
        when(repo.save(any(ClimbingSession.class))).thenAnswer(inv -> {
            ClimbingSession s = inv.getArgument(0);
            setField(s, "id", 1L);
            return s;
        });

        var cmd = new StartSessionCommand(7L, null, Instant.parse("2026-04-20T10:00:00Z"));
        var view = service.start(42L, cmd);
        assertThat(view.extId()).hasSize(26);
        assertThat(view.gymId()).isEqualTo(7L);
        assertThat(view.startedAt()).isEqualTo(Instant.parse("2026-04-20T10:00:00Z"));
        assertThat(view.endedAt()).isNull();
    }

    @Test
    void start_requires_startedAt() {
        var cmd = new StartSessionCommand(null, null, null);
        assertThatThrownBy(() -> service.start(1L, cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("SESSION_INVALID"));
    }

    @Test
    void listMine_caps_size_50() {
        Slice<ClimbingSession> empty = new SliceImpl<>(List.of(), Pageable.ofSize(50), false);
        when(repo.findByUserIdAndDeletedAtIsNullOrderByStartedAtDesc(eq(42L), any())).thenReturn(empty);

        service.listMine(42L, 0, 1000);
        // 실측: 호출 시 Pageable.size 가 50 으로 클램프
        org.mockito.ArgumentCaptor<Pageable> cap = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        org.mockito.Mockito.verify(repo).findByUserIdAndDeletedAtIsNullOrderByStartedAtDesc(eq(42L), cap.capture());
        assertThat(cap.getValue().getPageSize()).isEqualTo(50);
    }

    @Test
    void listMine_default_size_20_when_null() {
        Slice<ClimbingSession> empty = new SliceImpl<>(List.of(), Pageable.ofSize(20), false);
        when(repo.findByUserIdAndDeletedAtIsNullOrderByStartedAtDesc(eq(42L), any())).thenReturn(empty);

        service.listMine(42L, null, null);
        org.mockito.ArgumentCaptor<Pageable> cap = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        org.mockito.Mockito.verify(repo).findByUserIdAndDeletedAtIsNullOrderByStartedAtDesc(eq(42L), cap.capture());
        assertThat(cap.getValue().getPageSize()).isEqualTo(20);
    }

    @Test
    void getOwn_success() {
        ClimbingSession s = session(1L, "01HSESS", 42L, false);
        when(repo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        var view = service.getOwn(42L, "01HSESS");
        assertThat(view.extId()).isEqualTo("01HSESS");
    }

    @Test
    void getOwn_foreign_user_is_404() {
        ClimbingSession s = session(1L, "01HSESS", 99L, false);
        when(repo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        assertThatThrownBy(() -> service.getOwn(42L, "01HSESS"))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("SESSION_NOT_FOUND"));
    }

    @Test
    void getOwn_deleted_is_404() {
        ClimbingSession s = session(1L, "01HSESS", 42L, true);
        when(repo.findByExtId("01HSESS")).thenReturn(Optional.of(s));
        assertThatThrownBy(() -> service.getOwn(42L, "01HSESS"))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("SESSION_NOT_FOUND"));
    }

    @Test
    void update_partial_fields_applied() {
        ClimbingSession s = session(1L, "01HSESS", 42L, false);
        when(repo.findByExtId("01HSESS")).thenReturn(Optional.of(s));

        var cmd = new UpdateSessionCommand(
                Instant.parse("2026-04-20T12:00:00Z"),
                "메모",
                (byte) 4);
        var view = service.update(42L, "01HSESS", cmd);
        assertThat(view.endedAt()).isEqualTo(Instant.parse("2026-04-20T12:00:00Z"));
        assertThat(view.note()).isEqualTo("메모");
        assertThat(view.condition()).isEqualTo((byte) 4);
        assertThat(view.durationMin()).isNotNull(); // close() 로 계산됨
    }

    @Test
    void softDelete_sets_deletedAt() {
        ClimbingSession s = session(1L, "01HSESS", 42L, false);
        when(repo.findByExtId("01HSESS")).thenReturn(Optional.of(s));

        service.softDelete(42L, "01HSESS");
        assertThat(s.isDeleted()).isTrue();
    }

    // --- helpers ---

    private static ClimbingSession session(long id, String extId, long userId, boolean deleted) {
        ClimbingSession s = ClimbingSession.start(extId, userId, null, Instant.parse("2026-04-20T10:00:00Z"));
        setField(s, "id", id);
        if (deleted) s.softDelete();
        return s;
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
