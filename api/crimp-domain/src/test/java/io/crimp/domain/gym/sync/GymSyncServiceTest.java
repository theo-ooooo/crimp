package io.crimp.domain.gym.sync;

import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.gym.GymRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@link GymSyncService} 의 dryRun / apply 흐름 + 50% 가드 단위 테스트 (PR #84 리뷰 I2).
 */
class GymSyncServiceTest {

    private static final BigDecimal LAT = new BigDecimal("37.5008");
    private static final BigDecimal LNG = new BigDecimal("127.0376");

    private RemoteGym remote(String name, String address, String phone) {
        return new RemoteGym("kakao-" + name, name, "더클라임", address, LAT, LNG, phone);
    }

    @Test
    void dryRun_invokesSourceAndDoesNotMutateRepo() {
        GymSyncSource source = mock(GymSyncSource.class);
        GymRepository repo = mock(GymRepository.class);
        when(source.fetchByRadius(eq(LAT), eq(LNG), eq(5000)))
                .thenReturn(List.of(
                        remote("더클라임 강남점", "서울 강남구 테헤란로8길 21", null)));
        when(repo.findAll()).thenReturn(List.<Gym>of());

        var service = new GymSyncService(source, repo);
        var result = service.dryRun(LAT, LNG, 5000);

        assertThat(result.additions()).hasSize(1);
        assertThat(result.updates()).isEmpty();
        verify(repo, never()).save(any());
    }

    @Test
    void apply_insertsAdditionsOnly() {
        GymSyncSource source = mock(GymSyncSource.class);
        GymRepository repo = mock(GymRepository.class);
        when(repo.count()).thenReturn(10L);
        when(repo.save(any(Gym.class))).thenAnswer(inv -> inv.getArgument(0));

        var diff = new GymSyncDiff.Result(
                List.of(remote("새매장 A", "서울 강남구 a", null),
                        remote("새매장 B", "서울 강남구 b", null)),
                List.of(),
                List.of()
        );

        var service = new GymSyncService(source, repo);
        var report = service.apply(diff);

        assertThat(report.inserted()).isEqualTo(2);
        assertThat(report.updated()).isEqualTo(0);
        assertThat(report.missingFromRemote()).isEqualTo(0);
        verify(repo, times(2)).save(any(Gym.class));
    }

    @Test
    void apply_mutatesUpdateCandidatesInPlace() {
        // Persistent context 의 dirty check 를 신뢰하므로 save() 는 호출되지 않고,
        // 대신 UpdateCandidate.current() 인스턴스가 직접 mutate 되어야 한다.
        GymSyncSource source = mock(GymSyncSource.class);
        GymRepository repo = mock(GymRepository.class);
        when(repo.count()).thenReturn(20L);

        Gym existing = GymTestFactory.gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21",
                LAT, LNG, "더클라임", null);
        BigDecimal newLat = LAT.add(new BigDecimal("0.0010000"));
        var diff = new GymSyncDiff.Result(
                List.of(),
                List.of(new GymSyncDiff.UpdateCandidate(existing,
                        new RemoteGym("kakao-x", "더클라임 강남점", "The Climb",
                                "서울 강남구 테헤란로8길 21", newLat, LNG, "02-1234-5678"))),
                List.of()
        );

        var service = new GymSyncService(source, repo);
        var report = service.apply(diff);

        assertThat(report.inserted()).isEqualTo(0);
        assertThat(report.updated()).isEqualTo(1);
        assertThat(existing.getBrand()).isEqualTo("The Climb");
        assertThat(existing.getPhone()).isEqualTo("02-1234-5678");
        assertThat(existing.getLat()).isEqualByComparingTo(newLat);
        // dirty check 에 의존하므로 save 호출은 없어야 함.
        verify(repo, never()).save(any());
    }

    @Test
    void apply_throwsWhenChangeRatioExceedsLimit() {
        GymSyncSource source = mock(GymSyncSource.class);
        GymRepository repo = mock(GymRepository.class);
        when(repo.count()).thenReturn(10L);

        // 6 추가 / 10 = 60% > 50% 가드 → IllegalStateException
        AtomicInteger seq = new AtomicInteger();
        var additions = java.util.stream.IntStream.range(0, 6)
                .mapToObj(i -> remote("매장-" + seq.incrementAndGet(), "서울 강남구 " + i, null))
                .toList();
        var diff = new GymSyncDiff.Result(additions, List.of(), List.of());

        var service = new GymSyncService(source, repo);
        assertThatThrownBy(() -> service.apply(diff))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("change ratio");
        verify(repo, never()).save(any());
    }

    @Test
    void apply_doesNotThrowWhenRepoIsEmpty() {
        // count=0 인 빈 DB 에서는 ratio 계산이 무의미 → 가드 통과 (초기 시드 상황 대응).
        GymSyncSource source = mock(GymSyncSource.class);
        GymRepository repo = mock(GymRepository.class);
        when(repo.count()).thenReturn(0L);
        when(repo.save(any(Gym.class))).thenAnswer(inv -> inv.getArgument(0));

        var diff = new GymSyncDiff.Result(
                List.of(remote("매장 A", "서울 강남구 a", null),
                        remote("매장 B", "서울 강남구 b", null)),
                List.of(),
                List.of()
        );

        var service = new GymSyncService(source, repo);
        var report = service.apply(diff);
        assertThat(report.inserted()).isEqualTo(2);
    }
}
