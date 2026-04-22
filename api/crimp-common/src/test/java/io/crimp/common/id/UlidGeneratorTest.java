package io.crimp.common.id;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class UlidGeneratorTest {

    /** Crockford Base32: 0-9, A-Z 중 I/L/O/U 제외. */
    private static final Pattern ULID_PATTERN = Pattern.compile("^[0-9A-HJKMNP-TV-Z]{26}$");

    @Test
    void next_returns26CharCrockfordBase32() {
        for (int i = 0; i < 100; i++) {
            String ulid = UlidGenerator.next();
            assertThat(ulid).hasSize(26);
            assertThat(ulid).matches(ULID_PATTERN);
        }
    }

    @Test
    void next_is_unique_across_many_calls() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 10_000; i++) {
            seen.add(UlidGenerator.next());
        }
        assertThat(seen).hasSize(10_000);
    }

    @Test
    void next_is_monotonically_increasing_by_time_prefix() throws InterruptedException {
        String first = UlidGenerator.next();
        Thread.sleep(2); // 다른 밀리초 보장
        String second = UlidGenerator.next();
        // 상위 10자 (48bit 타임) 가 동일하거나 second 가 사전식 더 큼
        String firstTime = first.substring(0, 10);
        String secondTime = second.substring(0, 10);
        assertThat(secondTime.compareTo(firstTime)).isGreaterThanOrEqualTo(0);
    }
}
