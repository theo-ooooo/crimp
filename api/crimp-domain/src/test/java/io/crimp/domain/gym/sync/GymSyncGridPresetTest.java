package io.crimp.domain.gym.sync;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class GymSyncGridPresetTest {

    @Test
    void seoulGu_has25Districts_allUniqueLabels() {
        var regions = GymSyncGridPreset.SEOUL_GU.regions();
        assertThat(regions).hasSize(25);
        assertThat(regions).extracting(GymSyncRegion::label).doesNotHaveDuplicates();
    }

    @Test
    void seoulGu_coordinatesInsideSeoulBoundingBox() {
        // 서울 대략 위도 37.4~37.7, 경도 126.8~127.2 — 모든 좌표가 이 범위에 들어와야 한다.
        BigDecimal latMin = new BigDecimal("37.40");
        BigDecimal latMax = new BigDecimal("37.70");
        BigDecimal lngMin = new BigDecimal("126.80");
        BigDecimal lngMax = new BigDecimal("127.20");

        for (GymSyncRegion r : GymSyncGridPreset.SEOUL_GU.regions()) {
            assertThat(r.lat()).as("lat of %s", r.label())
                    .isBetween(latMin, latMax);
            assertThat(r.lng()).as("lng of %s", r.label())
                    .isBetween(lngMin, lngMax);
            assertThat(r.radiusMeters()).as("radius of %s", r.label())
                    .isBetween(100, 20000);
        }
    }
}
