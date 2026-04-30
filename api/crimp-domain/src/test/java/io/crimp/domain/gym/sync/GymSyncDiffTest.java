package io.crimp.domain.gym.sync;

import io.crimp.core.entity.gym.Gym;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link GymSyncDiff#compute} 의 분류 로직 단위 테스트.
 */
class GymSyncDiffTest {

    private static final BigDecimal LAT = new BigDecimal("37.5008000");
    private static final BigDecimal LNG = new BigDecimal("127.0376000");

    private static Gym gym(long id, String name, String address, BigDecimal lat, BigDecimal lng, String brand, String phone) {
        return GymTestFactory.gym(id, name, address, lat, lng, brand, phone);
    }

    private static RemoteGym remote(String name, String address, BigDecimal lat, BigDecimal lng, String brand, String phone) {
        return new RemoteGym("kakao-" + name.hashCode(), name, brand, address, lat, lng, phone);
    }

    @Test
    void emptyInputsProduceEmptyResult() {
        var result = GymSyncDiff.compute(List.of(), List.of());
        assertThat(result.additions()).isEmpty();
        assertThat(result.updates()).isEmpty();
        assertThat(result.missingFromRemote()).isEmpty();
        assertThat(result.remoteCount()).isZero();
    }

    @Test
    void resultExposesRemoteCount() {
        var current = List.<Gym>of();
        var remote = List.of(
                remote("A", "서울 강남구 a", LAT, LNG, "더클라임", null),
                remote("B", "서울 강남구 b", LAT, LNG, "더클라임", null),
                remote("C", "서울 강남구 c", LAT, LNG, "더클라임", null));
        var result = GymSyncDiff.compute(remote, current);
        assertThat(result.remoteCount()).isEqualTo(3); // additions + matched 의 합 = remote.size()
    }

    @Test
    void newRemoteEntriesAreAdditions() {
        var current = List.<Gym>of();
        var remote = List.of(
                remote("더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null));
        var result = GymSyncDiff.compute(remote, current);
        assertThat(result.additions()).hasSize(1);
        assertThat(result.additions().get(0).name()).isEqualTo("더클라임 강남점");
        assertThat(result.updates()).isEmpty();
        assertThat(result.missingFromRemote()).isEmpty();
    }

    @Test
    void exactMatchProducesNeitherAdditionNorUpdate() {
        var existing = gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null);
        var remote = List.of(
                remote("더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null));
        var result = GymSyncDiff.compute(remote, List.of(existing));
        assertThat(result.additions()).isEmpty();
        assertThat(result.updates()).isEmpty();
        assertThat(result.missingFromRemote()).isEmpty();
    }

    @Test
    void coordinateShiftProducesUpdate() {
        var existing = gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null);
        // 위도 +0.001 ≒ 110m 이동 — 임계치(0.0005) 초과.
        var shifted = LAT.add(new BigDecimal("0.0010000"));
        var remote = List.of(
                remote("더클라임 강남점", "서울 강남구 테헤란로8길 21", shifted, LNG, "더클라임", null));
        var result = GymSyncDiff.compute(remote, List.of(existing));
        assertThat(result.additions()).isEmpty();
        assertThat(result.updates()).hasSize(1);
        assertThat(result.updates().get(0).current().getId()).isEqualTo(1L);
    }

    @Test
    void smallCoordinateNoiseDoesNotProduceUpdate() {
        var existing = gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null);
        // 위도 +0.0001 ≒ 11m — 임계치 이하.
        var jittered = LAT.add(new BigDecimal("0.0001000"));
        var remote = List.of(
                remote("더클라임 강남점", "서울 강남구 테헤란로8길 21", jittered, LNG, "더클라임", null));
        var result = GymSyncDiff.compute(remote, List.of(existing));
        assertThat(result.additions()).isEmpty();
        assertThat(result.updates()).isEmpty();
    }

    @Test
    void brandChangeProducesUpdate() {
        var existing = gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null);
        var remote = List.of(
                remote("더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "The Climb", null));
        var result = GymSyncDiff.compute(remote, List.of(existing));
        assertThat(result.updates()).hasSize(1);
    }

    @Test
    void phoneChangeProducesUpdate() {
        var existing = gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null);
        var remote = List.of(
                remote("더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", "02-1234-5678"));
        var result = GymSyncDiff.compute(remote, List.of(existing));
        assertThat(result.updates()).hasSize(1);
    }

    @Test
    void remoteNullBrandOrPhoneDoesNotProduceUpdate() {
        // [PR #85 리뷰 I3] 외부가 brand/phone 을 일시적으로 빠뜨려 null 로 반환해도, 기존 값을
        // 덮어쓰지 않도록 diff 단계에서 update 후보로 잡지 않는다.
        var existing = gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", "02-1111-2222");
        var remote = List.of(
                remote("더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, null, null));
        var result = GymSyncDiff.compute(remote, List.of(existing));
        assertThat(result.updates()).isEmpty();
        assertThat(result.additions()).isEmpty();
    }

    @Test
    void caseAndSpaceDifferencesAreNormalizedAsSameMatch() {
        var existing = gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null);
        // 대소문자/공백 차이는 동일 매장으로 매칭 — 신규 등록 X.
        var remote = List.of(
                remote("더클라임  강남점", "서울 강남구 테헤란로8길 21 ", LAT, LNG, "더클라임", null));
        var result = GymSyncDiff.compute(remote, List.of(existing));
        assertThat(result.additions()).isEmpty();
        assertThat(result.updates()).isEmpty();
    }

    @Test
    void suffixVariantsAreMatched() {
        // [PR #111] "강남" / "강남점" / "강남지점" / "강남직영점" / "강남 점" 모두 동일 매장.
        var existing = gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null);
        var remoteVariants = List.of(
                remote("더클라임 강남",       "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null),
                remote("더클라임 강남점",     "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null),
                remote("더클라임 강남지점",   "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null),
                remote("더클라임 강남직영점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null),
                remote("더클라임강남",       "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null)
        );
        for (var r : remoteVariants) {
            var result = GymSyncDiff.compute(List.of(r), List.of(existing));
            assertThat(result.additions())
                    .as("variant '%s' should match existing", r.name())
                    .isEmpty();
        }
    }

    @Test
    void currentEntryNotInRemoteIsMissing() {
        var existing = gym(1L, "더클라임 강남점", "서울 강남구 테헤란로8길 21", LAT, LNG, "더클라임", null);
        var remote = List.<RemoteGym>of();
        var result = GymSyncDiff.compute(remote, List.of(existing));
        assertThat(result.missingFromRemote()).hasSize(1);
        assertThat(result.missingFromRemote().get(0).getId()).isEqualTo(1L);
    }
}
