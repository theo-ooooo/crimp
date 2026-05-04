package io.crimp.domain.gym;

import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.gym.GymStats;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.gym.GymStatsCountRow;
import io.crimp.core.repository.gym.GymStatsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GymStatsServiceTest {

    private GymRepository gymRepo;
    private GymStatsRepository gymStatsRepo;
    private GymStatsService service;

    @BeforeEach
    void setUp() {
        gymRepo = mock(GymRepository.class);
        gymStatsRepo = mock(GymStatsRepository.class);
        service = new GymStatsService(gymRepo, gymStatsRepo,
                Clock.fixed(Instant.parse("2026-05-04T00:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void loadByGymIds_maps_existing_rows_and_defaults_missing() {
        when(gymStatsRepo.findByGymIdIn(List.of(1L, 2L))).thenReturn(List.of(
                stats(1L, new BigDecimal("4.2"), 12L, 34L)));

        Map<Long, GymStatsSnapshot> rows = service.loadByGymIds(List.of(1L, 2L));

        assertThat(rows.get(1L).rating()).isEqualByComparingTo("4.2");
        assertThat(rows.get(1L).sendCount()).isEqualTo(12L);
        assertThat(rows.get(1L).monthlyUserCount()).isEqualTo(34L);
        assertThat(rows).doesNotContainKey(2L);
    }

    @Test
    void refreshAll_merges_aggregates_and_preserves_rating() {
        Gym gangnam = gym(10L, "01HGN", "강남점");
        Gym hongdae = gym(11L, "01HHD", "홍대점");
        when(gymRepo.findAllByStatus(GymStatus.ACTIVE)).thenReturn(List.of(gangnam, hongdae));

        when(gymStatsRepo.findByGymIdIn(anyCollection())).thenReturn(List.of(
                stats(10L, new BigDecimal("4.5"), 9L, 3L)));
        when(gymStatsRepo.countSendsByGymId(any())).thenReturn(List.of(
                new GymStatsCountRow(10L, 111L),
                new GymStatsCountRow(11L, 222L)));
        when(gymStatsRepo.countMonthlyUsersByGymId(any())).thenReturn(List.of(
                new GymStatsCountRow(10L, 7L),
                new GymStatsCountRow(11L, 8L)));

        service.refreshAll();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<GymStats>> rowsCap = ArgumentCaptor.forClass(List.class);
        verify(gymStatsRepo).saveAll(rowsCap.capture());

        List<GymStats> rows = rowsCap.getValue();
        assertThat(rows).hasSize(2);
        assertThat(rows).extracting(GymStats::getGymId).containsExactlyInAnyOrder(10L, 11L);
        assertThat(rows).filteredOn(r -> r.getGymId().equals(10L))
                .first()
                .satisfies(r -> {
                    assertThat(r.getRating()).isEqualByComparingTo("4.5");
                    assertThat(r.getSendCount()).isEqualTo(111L);
                    assertThat(r.getMonthlyUserCount()).isEqualTo(7L);
                });
        assertThat(rows).filteredOn(r -> r.getGymId().equals(11L))
                .first()
                .satisfies(r -> {
                    assertThat(r.getRating()).isNull();
                    assertThat(r.getSendCount()).isEqualTo(222L);
                    assertThat(r.getMonthlyUserCount()).isEqualTo(8L);
                });
    }

    private static Gym gym(long id, String extId, String name) {
        Gym g = Gym.create(extId, name, "서울시 어딘가",
                new BigDecimal("37.5000000"), new BigDecimal("127.0000000"));
        setField(g, "id", id);
        return g;
    }

    private static GymStats stats(long gymId, BigDecimal rating, long sendCount, long monthlyUserCount) {
        GymStats stats = GymStats.create(gymId);
        stats.update(rating, sendCount, monthlyUserCount);
        return stats;
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
