package io.crimp.api.common;

import io.crimp.common.response.ApiResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * 모든 `@RestController` 반환값을 `ApiResponse` envelope 로 자동 래핑한다.
 *
 * <p>래핑 규칙:
 * <ul>
 *   <li>이미 `ApiResponse` 면 통과.
 *   <li>Spring Actuator / Swagger UI / OpenAPI 경로는 skip (body 형태를 보존).
 *   <li>그 외는 `ApiResponse.success(body)` 로 래핑. body 가 null 이어도 직렬화 시
 *       `@JsonInclude(NON_NULL)` 에 의해 `data` 필드는 누락된다.
 * </ul>
 *
 * <p>204 No Content (`ResponseEntity.noContent().build()`) 는 body 가 없으므로
 * 래핑되지 않는다 — 클라이언트는 204 를 성공 신호로 자연스럽게 처리한다.
 */
@RestControllerAdvice
@Profile("!test")
public class GlobalResponseWrapper implements ResponseBodyAdvice<Object> {

    private static final String[] SKIP_PATH_PREFIXES = {
            "/actuator",
            "/v3/api-docs",
            "/swagger-ui",
            "/swagger-resources",
            "/webjars"
    };

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        // Spring framework 내부 컨트롤러 (예: BasicErrorController) 와 이미 ApiResponse 를 반환하는 메서드는 건드리지 않는다.
        Class<?> containing = returnType.getContainingClass();
        if (containing.getName().startsWith("org.springframework")) {
            return false;
        }
        return !ApiResponse.class.isAssignableFrom(returnType.getParameterType());
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType contentType,
            Class<? extends HttpMessageConverter<?>> converterType,
            ServerHttpRequest request,
            ServerHttpResponse response) {
        // 이미 envelope 이면 통과 (예: @ExceptionHandler 가 ResponseEntity<ApiResponse<Void>> 반환 시
        // Spring 이 ResponseEntity 를 풀어 inner body=ApiResponse 를 여기로 전달).
        if (body instanceof ApiResponse<?>) {
            return body;
        }

        if (isSkippedPath(request.getURI().getPath())) {
            return body;
        }

        return ApiResponse.success(body);
    }

    /**
     * 경로 prefix 매칭은 정확히 prefix 거나 prefix 다음에 `/` 가 와야 한다.
     * 예: `/actuator` 와 `/actuator/health` 는 skip, `/actuator-other` 는 skip 안 됨.
     */
    private static boolean isSkippedPath(String path) {
        for (String prefix : SKIP_PATH_PREFIXES) {
            if (path.equals(prefix) || path.startsWith(prefix + "/")) {
                return true;
            }
        }
        return false;
    }
}
