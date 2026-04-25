package io.crimp.api.common;

import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import org.junit.jupiter.api.Test;
import org.springframework.http.server.ServerHttpRequest;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * `GlobalResponseWrapper.beforeBodyWrite` 단위 테스트 — 래핑/통과/스킵 결정 로직 회귀 방어.
 *
 * `supports()` 는 Spring framework 가 호출하므로 통합 테스트가 필요해 여기서는 다루지 않는다.
 */
class GlobalResponseWrapperTest {

    private final GlobalResponseWrapper wrapper = new GlobalResponseWrapper();

    @Test
    void wraps_plain_object_into_success_envelope() {
        Object body = wrapper.beforeBodyWrite(
                "hello", null, null, null, mockRequest("/api/v1/me"), null);

        assertThat(body).isInstanceOfSatisfying(ApiResponse.class, env -> {
            assertThat(env.status()).isTrue();
            assertThat(env.data()).isEqualTo("hello");
            assertThat(env.error()).isNull();
        });
    }

    @Test
    void wraps_null_body_into_success_envelope_with_null_data() {
        Object body = wrapper.beforeBodyWrite(
                null, null, null, null, mockRequest("/api/v1/sessions"), null);

        assertThat(body).isInstanceOfSatisfying(ApiResponse.class, env -> {
            assertThat(env.status()).isTrue();
            assertThat(env.data()).isNull();
        });
    }

    @Test
    void passes_through_when_body_already_envelope() {
        ApiResponse<String> already = ApiResponse.success("preserved");
        Object body = wrapper.beforeBodyWrite(
                already, null, null, null, mockRequest("/api/v1/me"), null);

        assertThat(body).isSameAs(already);
    }

    @Test
    void passes_through_failure_envelope() {
        ApiResponse<Void> failure = ApiResponse.failure(ErrorBody.of("X", "Y"));
        Object body = wrapper.beforeBodyWrite(
                failure, null, null, null, mockRequest("/api/v1/me"), null);

        assertThat(body).isSameAs(failure);
    }

    @Test
    void skips_actuator_path() {
        Object original = "{\"status\":\"UP\"}";
        Object body = wrapper.beforeBodyWrite(
                original, null, null, null, mockRequest("/actuator/health"), null);

        assertThat(body).isSameAs(original);
    }

    @Test
    void skips_exact_actuator_root() {
        Object original = "links";
        Object body = wrapper.beforeBodyWrite(
                original, null, null, null, mockRequest("/actuator"), null);

        assertThat(body).isSameAs(original);
    }

    @Test
    void does_not_skip_actuator_lookalike() {
        Object original = "ok";
        Object body = wrapper.beforeBodyWrite(
                original, null, null, null, mockRequest("/actuator-other"), null);

        // prefix 만 같고 정확히 매치되지 않는 경로는 정상 래핑되어야 한다.
        assertThat(body).isInstanceOf(ApiResponse.class);
    }

    @Test
    void skips_swagger_paths() {
        for (String path : new String[]{
                "/v3/api-docs",
                "/v3/api-docs/swagger-config",
                "/swagger-ui/index.html",
                "/swagger-resources/configuration",
                "/webjars/swagger-ui/index.html",
        }) {
            Object body = wrapper.beforeBodyWrite(
                    "raw", null, null, null, mockRequest(path), null);
            assertThat(body).as("path: %s", path).isEqualTo("raw");
        }
    }

    private static ServerHttpRequest mockRequest(String path) {
        ServerHttpRequest req = mock(ServerHttpRequest.class);
        when(req.getURI()).thenReturn(URI.create("http://localhost:8080" + path));
        return req;
    }
}
