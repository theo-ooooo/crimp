package io.crimp.domain.log;

import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.log.ClimbingSession;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.log.ClimbingSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.lang.reflect.Field;
import java.math.BigDecimal;
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
    private GymRepository gymRepo;
    private SessionService service;

    @BeforeEach
    void setUp() {
        repo = mock(ClimbingSessionRepository.class);
        gymRepo = mock(GymRepository.class);
        service = new SessionService(repo, gymRepo);
    }

    @Test
    void start_persists_and_returns_view() {
        when(repo.save(any(ClimbingSession.class))).thenAnswer(inv -> {
            ClimbingSession s = inv.getArgument(0);
            setField(s, "id", 1L);
            return s;
        });

        var cmd = new StartSessionCommand(null, 7L, null, Instant.parse("2026-04-20T10:00:00Z"));
        var view = service.start(42L, cmd);
        assertThat(view.extId()).hasSize(26);
        assertThat(view.gymId()).isEqualTo(7L);
        assertThat(view.startedAt()).isEqualTo(Instant.parse("2026-04-20T10:00:00Z"));
        assertThat(view.endedAt()).isNull();
    }

    @Test
    void start_requires_startedAt() {
        var cmd = new StartSessionCommand(null, null, null, null);
        assertThatThrownBy(() -> service.start(1L, cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("SESSION_INVALID"));
    }

    @Test
    void start_resolves_gymExtId_to_internal_id_and_falls_back_to_gym_name() {
        // 클라이언트는 gymExtId 만 주고 gymNameRaw 는 미지정.
        // 서비스는 Gym 조회 후 id + name 으로 fallback 해야 한다.
        Gym gym = gym(55L, "01HGYM0000000000000000000X", "클라임파크 강남점");
        when(gymRepo.findByExtId("01HGYM0000000000000000000X"))
                .thenReturn(Optional.of(gym));
        when(repo.save(any(ClimbingSession.class))).thenAnswer(inv -> {
            ClimbingSession s = inv.getArgument(0);
            setField(s, "id", 1L);
            return s;
        });

        var cmd = new StartSessionCommand(
                "01HGYM0000000000000000000X",
                null,
                null,
                Instant.parse("2026-04-22T10:00:00Z"));
        var view = service.start(42L, cmd);
        assertThat(view.gymId()).isEqualTo(55L);
        assertThat(view.gymNameRaw()).isEqualTo("클라임파크 강남점");
    }

    @Test
    void start_prefers_client_gymNameRaw_over_gym_name_when_provided() {
        // 클라이언트가 이미 gymNameRaw 를 제공한 경우에는 Gym.name 으로 덮어쓰지 않는다.
        Gym gym = gym(55L, "01HGYM0000000000000000000X", "클라임파크 강남점");
        when(gymRepo.findByExtId("01HGYM0000000000000000000X"))
                .thenReturn(Optional.of(gym));
        when(repo.save(any(ClimbingSession.class))).thenAnswer(inv -> {
            ClimbingSession s = inv.getArgument(0);
            setField(s, "id", 1L);
            return s;
        });

        var cmd = new StartSessionCommand(
                "01HGYM0000000000000000000X",
                null,
                "사용자 지정 별칭",
                Instant.parse("2026-04-22T10:00:00Z"));
        var view = service.start(42L, cmd);
        assertThat(view.gymId()).isEqualTo(55L);
        assertThat(view.gymNameRaw()).isEqualTo("사용자 지정 별칭");
    }

    @Test
    void start_prefers_gymExtId_over_gymId_when_both_provided() {
        // 회귀 방어: 클라이언트가 gymExtId 와 (레거시) gymId 를 동시에 보내면
        // 서비스는 extId 를 최종 소스 오브 트루스로 채택해야 한다.
        // gymId 999L 이 실제 사용되면 잘못된 암장에 세션이 묶이는 회귀.
        Gym gym = gym(55L, "01HGYM0000000000000000000X", "클라임파크 강남점");
        when(gymRepo.findByExtId("01HGYM0000000000000000000X"))
                .thenReturn(Optional.of(gym));
        when(repo.save(any(ClimbingSession.class))).thenAnswer(inv -> {
            ClimbingSession s = inv.getArgument(0);
            setField(s, "id", 1L);
            return s;
        });

        var cmd = new StartSessionCommand(
                "01HGYM0000000000000000000X",
                999L, // 레거시 gymId — extId 가 있으면 무시되어야 함
                null,
                Instant.parse("2026-04-22T10:00:00Z"));
        var view = service.start(42L, cmd);
        assertThat(view.gymId()).isEqualTo(55L); // gym.findByExtId 결과 id 우선
        assertThat(view.gymNameRaw()).isEqualTo("클라임파크 강남점");
    }

    @Test
    void start_throws_GYM_NOT_FOUND_when_gymExtId_unresolved() {
        when(gymRepo.findByExtId("01HMISSING0000000000000000"))
                .thenReturn(Optional.empty());

        var cmd = new StartSessionCommand(
                "01HMISSING0000000000000000",
                null,
                null,
                Instant.parse("2026-04-22T10:00:00Z"));
        assertThatThrownBy(() -> service.start(42L, cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("GYM_NOT_FOUND"));
    }

    @Test
    void listMine_caps_size_50() {
        Slice<ClimbingSession> empty = new SliceImpl<>(List.of(), Pageable.ofSize(50), false);
        when(repo.searchMine(eq(42L), any(), any())).thenReturn(empty);

        var result = service.listMine(42L, null, 1000);
        assertThat(result.size()).isEqualTo(50);
    }

    @Test
    void listMine_default_size_20_when_null() {
        Slice<ClimbingSession> empty = new SliceImpl<>(List.of(), Pageable.ofSize(20), false);
        when(repo.searchMine(eq(42L), any(), any())).thenReturn(empty);

        var result = service.listMine(42L, null, null);
        assertThat(result.size()).isEqualTo(20);
        assertThat(result.nextCursor()).isNull();
    }

    @Test
    void listMine_sets_nextCursor_when_hasNext() {
        ClimbingSession s1 = session(10L, "01HX1", 42L, false);
        ClimbingSession s2 = session(7L, "01HX2", 42L, false);
        Slice<ClimbingSession> slice = new SliceImpl<>(List.of(s1, s2), Pageable.ofSize(2), true);
        when(repo.searchMine(eq(42L), any(), any())).thenReturn(slice);

        var result = service.listMine(42L, 100L, 2);
        assertThat(result.nextCursor()).isEqualTo(7L);
        assertThat(result.items()).hasSize(2);
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
    void update_rejects_endedAt_before_startedAt() {
        ClimbingSession s = session(1L, "01HSESS", 42L, false);
        when(repo.findByExtId("01HSESS")).thenReturn(Optional.of(s));

        // startedAt=10:00Z, endedAt=09:00Z 는 역전 → 거부
        var cmd = new UpdateSessionCommand(Instant.parse("2026-04-20T09:00:00Z"), null, null);
        assertThatThrownBy(() -> service.update(42L, "01HSESS", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("SESSION_INVALID"));
    }

    @Test
    void update_rejects_condition_out_of_range() {
        ClimbingSession s = session(1L, "01HSESS", 42L, false);
        when(repo.findByExtId("01HSESS")).thenReturn(Optional.of(s));

        var cmd = new UpdateSessionCommand(null, null, (byte) 7);
        assertThatThrownBy(() -> service.update(42L, "01HSESS", cmd))
                .isInstanceOf(SessionException.class)
                .satisfies(e -> assertThat(((SessionException) e).code()).isEqualTo("SESSION_INVALID"));
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
        ClimbingSession s = ClimbingSession.start(
                extId, userId, null, null, Instant.parse("2026-04-20T10:00:00Z"));
        setField(s, "id", id);
        if (deleted) s.softDelete();
        return s;
    }

    private static Gym gym(long id, String extId, String name) {
        Gym g = Gym.create(extId, name, "주소", BigDecimal.ZERO, BigDecimal.ZERO);
        setField(g, "id", id);
        return g;
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
