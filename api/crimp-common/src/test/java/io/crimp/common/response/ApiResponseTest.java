package io.crimp.common.response;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** `ApiResponse` 직렬화 회귀 방어 — `@JsonInclude(NON_NULL)` + 봉투 스펙. */
class ApiResponseTest {

    private final ObjectMapper om = new ObjectMapper();

    @Test
    void success_omits_error_field() {
        @SuppressWarnings("unchecked") Map<String, Object> map = om.convertValue(
                ApiResponse.success(Map.of("nickname", "민준")), Map.class);

        assertThat(map.get("status")).isEqualTo(true);
        assertThat(map).containsKey("data");
        assertThat(map).doesNotContainKey("error");
        @SuppressWarnings("unchecked") Map<String, Object> data = (Map<String, Object>) map.get("data");
        assertThat(data).containsEntry("nickname", "민준");
    }

    @Test
    void success_with_null_payload_omits_data_field() {
        @SuppressWarnings("unchecked") Map<String, Object> map = om.convertValue(ApiResponse.success(null), Map.class);

        assertThat(map.get("status")).isEqualTo(true);
        assertThat(map).doesNotContainKey("data");
        assertThat(map).doesNotContainKey("error");
    }

    @Test
    void failure_omits_data_field() {
        @SuppressWarnings("unchecked") Map<String, Object> map = om.convertValue(
                ApiResponse.failure(ErrorBody.of("AUTH_REQUIRED", "Authentication required")),
                Map.class);

        assertThat(map.get("status")).isEqualTo(false);
        assertThat(map).doesNotContainKey("data");
        @SuppressWarnings("unchecked") Map<String, Object> error = (Map<String, Object>) map.get("error");
        assertThat(error).containsEntry("code", "AUTH_REQUIRED");
        assertThat(error).containsEntry("message", "Authentication required");
        assertThat(error).doesNotContainKey("details");
    }

    @Test
    void error_body_with_details_serializes_them() {
        @SuppressWarnings("unchecked") Map<String, Object> map = om.convertValue(
                ApiResponse.failure(new ErrorBody(
                        "VALIDATION_FAILED", "validation", Map.of("field", "nickname"))),
                Map.class);

        @SuppressWarnings("unchecked") Map<String, Object> error = (Map<String, Object>) map.get("error");
        @SuppressWarnings("unchecked") Map<String, Object> details = (Map<String, Object>) error.get("details");
        assertThat(details).containsEntry("field", "nickname");
    }
}
