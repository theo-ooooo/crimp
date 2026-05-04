package io.crimp.domain.gym;

import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.log.GymRecentActivityRow;
import io.crimp.core.repository.log.SessionAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GymRecentActivityServiceTest {

    private GymRepository gymRepo;
    private SessionAttemptRepository attemptRepo;
    private GymRecentActivityService service;

    @BeforeEach
    void setUp() {
        gymRepo = mock(GymRepository.class);
        attemptRepo = mock(SessionAttemptRepository.class);
        service = new GymRecentActivityService(gymRepo, attemptRepo);
    }

    @Test
    void list_maps_recent_attempts_and_computes_avatar_color_hue() {
        Gym gym = gym(77L, "01HGYM", "오프더월", "오프더월클라이밍");
        when(gymRepo.findByExtIdAndStatus("01HGYM", GymStatus.ACTIVE)).thenReturn(Optional.of(gym));
        when(attemptRepo.findRecentActivityByGymId(eq(77L), eq(10))).thenReturn(List.of(
                new GymRecentActivityRow(1L, "01HUSER01", "서지우", "V5", AttemptResult.SEND,
                        Instant.parse("2026-05-04T01:00:00Z")),
                new GymRecentActivityRow(2L, "01HUSER02", "민준", "V3", AttemptResult.TRY,
                        Instant.parse("2026-05-04T00:30:00Z"))));

        var items = service.list("01HGYM", null);

        assertThat(items).hasSize(2);
        assertThat(items.get(0).userExtId()).isEqualTo("01HUSER01");
        assertThat(items.get(0).nickname()).isEqualTo("서지우");
        assertThat(items.get(0).avatarColorHue()).isEqualTo(250);
        assertThat(items.get(0).gradeValue()).isEqualTo("V5");
        assertThat(items.get(0).result()).isEqualTo(AttemptResult.SEND);
        verify(attemptRepo).findRecentActivityByGymId(77L, 10);
    }

    @Test
    void list_caps_size_at_50_and_defaults_to_10() {
        Gym gym = gym(77L, "01HGYM", "오프더월", "오프더월클라이밍");
        when(gymRepo.findByExtIdAndStatus("01HGYM", GymStatus.ACTIVE)).thenReturn(Optional.of(gym));
        when(attemptRepo.findRecentActivityByGymId(eq(77L), anyInt())).thenReturn(List.of());

        service.list("01HGYM", 0);
        service.list("01HGYM", 1000);

        verify(attemptRepo).findRecentActivityByGymId(77L, 10);
        verify(attemptRepo).findRecentActivityByGymId(77L, 50);
    }

    @Test
    void list_unknown_gym_throws() {
        when(gymRepo.findByExtIdAndStatus("nope", GymStatus.ACTIVE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.list("nope", 10))
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
