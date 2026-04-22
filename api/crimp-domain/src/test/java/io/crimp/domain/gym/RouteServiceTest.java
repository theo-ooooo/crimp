package io.crimp.domain.gym;

import io.crimp.core.entity.enums.GradeScale;
import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.gym.Route;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.gym.RouteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RouteServiceTest {

    private GymRepository gymRepo;
    private RouteRepository routeRepo;
    private RouteService service;

    @BeforeEach
    void setUp() {
        gymRepo = mock(GymRepository.class);
        routeRepo = mock(RouteRepository.class);
        service = new RouteService(gymRepo, routeRepo);
    }

    @Test
    void listByGym_returns_active_routes_ordered_desc() {
        Gym gym = gym(42L, "01HGYM42");
        when(gymRepo.findByExtIdAndStatus("01HGYM42", GymStatus.ACTIVE)).thenReturn(Optional.of(gym));

        Route r1 = route(30L, "01HR30", "루트A");
        Route r2 = route(20L, "01HR20", "루트B");
        Slice<Route> slice = new SliceImpl<>(List.of(r1, r2), Pageable.ofSize(20), false);
        when(routeRepo.findByGymIdCursor(eq(42L), any(), any())).thenReturn(slice);

        var result = service.listByGym("01HGYM42", null, 20);

        assertThat(result.items()).hasSize(2);
        assertThat(result.items().get(0).extId()).isEqualTo("01HR30");
        assertThat(result.items().get(1).extId()).isEqualTo("01HR20");
        assertThat(result.nextCursor()).isNull();
        assertThat(result.size()).isEqualTo(20);
    }

    @Test
    void listByGym_sets_nextCursor_when_hasNext() {
        Gym gym = gym(42L, "01HGYM42");
        when(gymRepo.findByExtIdAndStatus("01HGYM42", GymStatus.ACTIVE)).thenReturn(Optional.of(gym));

        Route r1 = route(30L, "01HR30", "A");
        Route r2 = route(20L, "01HR20", "B");
        Slice<Route> slice = new SliceImpl<>(List.of(r1, r2), Pageable.ofSize(2), true);
        when(routeRepo.findByGymIdCursor(eq(42L), eq(100L), any())).thenReturn(slice);

        var result = service.listByGym("01HGYM42", 100L, 2);

        assertThat(result.nextCursor()).isEqualTo(20L);
        assertThat(result.items()).hasSize(2);
    }

    @Test
    void listByGym_default_size_20_when_null_or_zero() {
        Gym gym = gym(42L, "01HGYM42");
        when(gymRepo.findByExtIdAndStatus("01HGYM42", GymStatus.ACTIVE)).thenReturn(Optional.of(gym));

        Slice<Route> empty = new SliceImpl<>(List.of(), Pageable.ofSize(20), false);
        when(routeRepo.findByGymIdCursor(eq(42L), any(), any())).thenReturn(empty);

        assertThat(service.listByGym("01HGYM42", null, null).size()).isEqualTo(20);
        assertThat(service.listByGym("01HGYM42", null, 0).size()).isEqualTo(20);
    }

    @Test
    void listByGym_caps_size_at_50() {
        Gym gym = gym(42L, "01HGYM42");
        when(gymRepo.findByExtIdAndStatus("01HGYM42", GymStatus.ACTIVE)).thenReturn(Optional.of(gym));

        Slice<Route> empty = new SliceImpl<>(List.of(), Pageable.ofSize(50), false);
        when(routeRepo.findByGymIdCursor(eq(42L), any(), any())).thenReturn(empty);

        var result = service.listByGym("01HGYM42", null, 1000);
        assertThat(result.size()).isEqualTo(50);
    }

    @Test
    void listByGym_gym_not_found_throws_and_does_not_query_routes() {
        when(gymRepo.findByExtIdAndStatus("unknown", GymStatus.ACTIVE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.listByGym("unknown", null, null))
                .isInstanceOf(GymException.class)
                .satisfies(e -> assertThat(((GymException) e).code()).isEqualTo("GYM_NOT_FOUND"));

        verifyNoInteractions(routeRepo);
    }

    @Test
    void listByGym_passes_cursor_and_gymId_to_repository() {
        Gym gym = gym(77L, "01HGYM77");
        when(gymRepo.findByExtIdAndStatus("01HGYM77", GymStatus.ACTIVE)).thenReturn(Optional.of(gym));

        Slice<Route> empty = new SliceImpl<>(List.of(), Pageable.ofSize(20), false);
        when(routeRepo.findByGymIdCursor(eq(77L), eq(555L), any())).thenReturn(empty);

        service.listByGym("01HGYM77", 555L, 20);

        verify(routeRepo).findByGymIdCursor(eq(77L), eq(555L), any());
    }

    @Test
    void listByGym_view_contains_all_route_fields() {
        Gym gym = gym(42L, "01HGYM42");
        when(gymRepo.findByExtIdAndStatus("01HGYM42", GymStatus.ACTIVE)).thenReturn(Optional.of(gym));

        Route r = route(30L, "01HR30", "모카");
        setField(r, "color", "red");
        // override defaults from route() helper

        setField(r, "gradeScale", GradeScale.V);
        setField(r, "gradeValue", "V4");
        setField(r, "gradeNumeric", new BigDecimal("4.0"));
        setField(r, "setter", "김세터");
        setField(r, "setAt", LocalDate.of(2026, 4, 1));

        Slice<Route> slice = new SliceImpl<>(List.of(r), Pageable.ofSize(20), false);
        when(routeRepo.findByGymIdCursor(eq(42L), any(), any())).thenReturn(slice);

        var result = service.listByGym("01HGYM42", null, null);
        RouteView v = result.items().get(0);
        assertThat(v.extId()).isEqualTo("01HR30");
        assertThat(v.name()).isEqualTo("모카");
        assertThat(v.color()).isEqualTo("red");
        assertThat(v.gradeScale()).isEqualTo(GradeScale.V);
        assertThat(v.gradeValue()).isEqualTo("V4");
        assertThat(v.gradeNumeric()).isEqualByComparingTo("4.0");
        assertThat(v.setter()).isEqualTo("김세터");
        assertThat(v.setAt()).isEqualTo(LocalDate.of(2026, 4, 1));
    }

    // --- helpers ---

    private static Gym gym(long id, String extId) {
        Gym g = Gym.create(extId, "암장 " + extId, "서울", new BigDecimal("37.5000000"), new BigDecimal("127.0000000"));
        setField(g, "id", id);
        return g;
    }

    private static Route route(long id, String extId, String name) {
        Route r = newRoute();
        setField(r, "id", id);
        setField(r, "extId", extId);
        setField(r, "gymId", 42L);
        setField(r, "name", name);
        setField(r, "gradeScale", GradeScale.V);
        setField(r, "gradeValue", "V3");
        setField(r, "gradeNumeric", new BigDecimal("3.0"));
        return r;
    }

    private static Route newRoute() {
        try {
            var ctor = Route.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            return ctor.newInstance();
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
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
