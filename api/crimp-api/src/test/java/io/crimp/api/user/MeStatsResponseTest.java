package io.crimp.api.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.crimp.api.user.UserController.MeStatsResponse;
import io.crimp.api.user.UserController.WeekRange;
import io.crimp.domain.user.MeStatsView;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * `MeStatsResponse` / `WeekRange` 직렬화 회귀 방어.
 *
 * Envelope 자동 래핑은 {@code GlobalResponseWrapperTest} 가 이미 커버하므로 여기서는
 * DTO 구조 자체 (필드명·타입·nested weekRange · LocalDate ISO 직렬화) 만 검증한다.
 * SecurityConfig·Filter·실 컨트롤러 통합은 testcontainers 기반 E2E 로 이월 (F3).
 */
class MeStatsResponseTest {

    private final ObjectMapper om = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Test
    void serializes_all_fields_with_nested_week_range_and_iso_dates() {
        MeStatsView view = new MeStatsView(
                3L, 14L, 87L, 412L, "V6",
                LocalDate.of(2026, 4, 20),
                LocalDate.of(2026, 4, 26));

        @SuppressWarnings("unchecked")
        Map<String, Object> map = om.convertValue(MeStatsResponse.of(view), Map.class);

        assertThat(map).containsEntry("weekSessions", 3L);
        assertThat(map).containsEntry("weekSends", 14L);
        assertThat(map).containsEntry("totalSessions", 87L);
        assertThat(map).containsEntry("totalSends", 412L);
        assertThat(map).containsEntry("topGrade", "V6");

        @SuppressWarnings("unchecked")
        Map<String, Object> week = (Map<String, Object>) map.get("weekRange");
        assertThat(week).containsEntry("start", "2026-04-20");
        assertThat(week).containsEntry("end", "2026-04-26");
    }

    @Test
    void serializes_null_top_grade_as_null_field() {
        // DTO 자체는 @JsonInclude(NON_NULL) 이 없으므로 null 필드도 키가 유지된다.
        // envelope 레벨에서 WRAP 될 때는 ApiResponse 의 NON_NULL 이 적용됨 (envelope.data 는 이 DTO 이므로 내부 필드 null 허용).
        MeStatsView view = new MeStatsView(
                0L, 0L, 0L, 0L, null,
                LocalDate.of(2026, 4, 20),
                LocalDate.of(2026, 4, 26));

        @SuppressWarnings("unchecked")
        Map<String, Object> map = om.convertValue(MeStatsResponse.of(view), Map.class);

        assertThat(map).containsKey("topGrade");
        assertThat(map.get("topGrade")).isNull();
    }

    @Test
    void week_range_record_serializes_start_and_end() {
        WeekRange range = new WeekRange(LocalDate.of(2025, 12, 29), LocalDate.of(2026, 1, 4));

        @SuppressWarnings("unchecked")
        Map<String, Object> map = om.convertValue(range, Map.class);

        assertThat(map).containsEntry("start", "2025-12-29");
        assertThat(map).containsEntry("end", "2026-01-04");
    }
}
