package io.crimp.domain.gym.sync;

import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.gym.GymRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
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
    void apply_refetchesAndMutatesManagedEntity() {
        // [PR #85 리뷰 B1] apply() 는 diff.current() 인스턴스를 직접 mutate 하지 않고,
        // findById(id) 로 본 트랜잭션의 영속 컨텍스트에서 재조회한 managed entity 에 mutate 한다.
        // 본 단위 테스트는 "apply() 가 findById 로 재조회 후 그 인스턴스를 mutate" 하는지만
        // 검증한다 — 실제 JPA dirty check 동작은 통합 테스트 (별도 PR, F1) 에서 보증.
        GymSyncSource source = mock(GymSyncSource.class);
        GymRepository repo = mock(GymRepository.class);
        when(repo.count()).thenReturn(20L);

        Gym detached = GymTestFactory.gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21",
                LAT, LNG, "더클라임", null);
        Gym managed = GymTestFactory.gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21",
                LAT, LNG, "더클라임", null);
        when(repo.findById(1L)).thenReturn(Optional.of(managed));

        BigDecimal newLat = LAT.add(new BigDecimal("0.0010000"));
        var diff = new GymSyncDiff.Result(
                List.of(),
                List.of(new GymSyncDiff.UpdateCandidate(detached,
                        new RemoteGym("kakao-x", "더클라임 강남점", "The Climb",
                                "서울 강남구 테헤란로8길 21", newLat, LNG, "02-1234-5678"))),
                List.of()
        );

        var service = new GymSyncService(source, repo);
        var report = service.apply(diff);

        assertThat(report.inserted()).isEqualTo(0);
        assertThat(report.updated()).isEqualTo(1);
        // mutate 된 것은 재조회한 managed 인스턴스여야 한다 (dirty check 가 작동하는 대상).
        assertThat(managed.getBrand()).isEqualTo("The Climb");
        assertThat(managed.getPhone()).isEqualTo("02-1234-5678");
        assertThat(managed.getLat()).isEqualByComparingTo(newLat);
        // detached 인스턴스는 건드리지 않아야 — 회귀 방지 (PR #84 B1 변종)
        assertThat(detached.getBrand()).isEqualTo("더클라임");
        verify(repo, never()).save(any());
    }

    @Test
    void apply_skipsUpdateWhenRowDeletedBetweenDryRunAndApply() {
        // [PR #85 리뷰 B1] dryRun 직후 다른 경로로 row 가 삭제된 케이스 — findById 가 empty
        // 를 리턴하면 카운터 증가 없이 skip 하고 다음 후보로. updated 카운트가 diff.updates 와
        // 어긋날 수 있는 유일한 정상 시나리오.
        GymSyncSource source = mock(GymSyncSource.class);
        GymRepository repo = mock(GymRepository.class);
        when(repo.count()).thenReturn(20L);
        when(repo.findById(1L)).thenReturn(Optional.empty());

        Gym detached = GymTestFactory.gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21",
                LAT, LNG, "더클라임", null);
        var diff = new GymSyncDiff.Result(
                List.of(),
                List.of(new GymSyncDiff.UpdateCandidate(detached,
                        new RemoteGym("kakao-x", "더클라임 강남점", "The Climb",
                                "서울 강남구 테헤란로8길 21", LAT, LNG, "02-1234-5678"))),
                List.of()
        );

        var service = new GymSyncService(source, repo);
        var report = service.apply(diff);

        assertThat(report.updated()).isEqualTo(0);
        verify(repo, never()).save(any());
    }

    @Test
    void apply_preservesExistingFieldWhenRemoteValueIsNull() {
        // [PR #85 리뷰 I3] 외부 응답이 brand/phone 을 일시적으로 null 로 반환해도 기존 값 보존.
        // (좌표는 Kakao 어댑터가 빈 좌표 doc 을 사전 스킵하므로 항상 non-null 가정.)
        GymSyncSource source = mock(GymSyncSource.class);
        GymRepository repo = mock(GymRepository.class);
        when(repo.count()).thenReturn(20L);

        Gym managed = GymTestFactory.gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21",
                LAT, LNG, "더클라임", "02-1234-5678");
        when(repo.findById(1L)).thenReturn(Optional.of(managed));

        BigDecimal newLat = LAT.add(new BigDecimal("0.0010000"));
        var diff = new GymSyncDiff.Result(
                List.of(),
                List.of(new GymSyncDiff.UpdateCandidate(
                        GymTestFactory.gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21",
                                LAT, LNG, "더클라임", "02-1234-5678"),
                        new RemoteGym("kakao-x", "더클라임 강남점", null,
                                "서울 강남구 테헤란로8길 21", newLat, LNG, null))),
                List.of()
        );

        var service = new GymSyncService(source, repo);
        service.apply(diff);

        assertThat(managed.getBrand()).isEqualTo("더클라임"); // 보존
        assertThat(managed.getPhone()).isEqualTo("02-1234-5678"); // 보존
        assertThat(managed.getLat()).isEqualByComparingTo(newLat); // 좌표는 갱신
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
