package io.crimp.domain.gym;

import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.log.GymActiveSessionRow;
import io.crimp.core.repository.log.SessionAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GymActiveSessionsServiceTest {

    private GymRepository gymRepo;
    private SessionAttemptRepository attemptRepo;
    private GymActiveSessionsService service;

    @BeforeEach
    void setUp() {
        gymRepo = mock(GymRepository.class);
        attemptRepo = mock(SessionAttemptRepository.class);
        service = new GymActiveSessionsService(gymRepo, attemptRepo);
    }

    @Test
    void get_maps_latest_grade_per_session_and_counts_active_users() {
        Gym gym = gym(77L, "01HGYM", "오프더월", "오프더월클라이밍");
        when(gymRepo.findByExtIdAndStatus("01HGYM", GymStatus.ACTIVE)).thenReturn(Optional.of(gym));
        when(attemptRepo.findActiveSessionsByGymId(eq(77L))).thenReturn(List.of(
                new GymActiveSessionRow(10L, 1L, "V6", new BigDecimal("6.0")),
                new GymActiveSessionRow(10L, 1L, "V4", new BigDecimal("4.0")),
                new GymActiveSessionRow(11L, 2L, "V8", new BigDecimal("8.0")),
                new GymActiveSessionRow(12L, 3L, null, null)
        ));

        var view = service.get("01HGYM");

        assertThat(view.activeUsers()).isEqualTo(3L);
        assertThat(view.gradeBuckets()).extracting(GymActiveSessionsView.GradeBucket::grade)
                .containsExactly("V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8+");
        assertThat(view.gradeBuckets()).extracting(GymActiveSessionsView.GradeBucket::count)
                .containsExactly(0L, 0L, 0L, 0L, 0L, 0L, 1L, 0L, 1L);
    }

    @Test
    void get_unknown_gym_throws() {
        when(gymRepo.findByExtIdAndStatus("nope", GymStatus.ACTIVE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get("nope"))
                .isInstanceOf(GymException.class)
                .satisfies(e -> assertThat(((GymException) e).code()).isEqualTo("GYM_NOT_FOUND"));
    }

    private static Gym gym(long id, String extId, String name, String brand) {
        Gym g = Gym.create(extId, name, "서울시 어딘가", new BigDecimal("37.5000000"), new BigDecimal("127.0000000"));
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
