package io.crimp.api.common;

import io.crimp.common.response.ApiResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
 *   <li>`ResponseEntity` 는 통과 (컨트롤러/예외 핸들러가 HTTP status 를 직접 제어).
 *   <li>Spring Actuator / Swagger UI / OpenAPI 경로는 skip (body 형태를 보존).
 *   <li>그 외는 `ApiResponse.success(body)` 로 래핑. body 가 null 이어도 `{status:true, data:null}` 로 직렬화.
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
        // 이미 envelope 이면 통과.
        if (body instanceof ApiResponse<?>) {
            return body;
        }
        // ResponseEntity<?> 의 body 는 이미 여기서 펼쳐진 상태이지만, body 자체가 ApiResponse 가 아니면 래핑한다.
        if (body instanceof ResponseEntity<?>) {
            return body;
        }

        String path = request.getURI().getPath();
        for (String prefix : SKIP_PATH_PREFIXES) {
            if (path.startsWith(prefix)) {
                return body;
            }
        }

        // String 반환 시 StringHttpMessageConverter 가 타자 맞지 않아 ClassCastException 을 발생시킨다.
        // 현재 프로젝트 컨트롤러는 String 반환을 사용하지 않으므로 별도 처리 없이 JSON 변환에 맡긴다.
        if (body instanceof ApiResponse) {
            return body;
        }
        return ApiResponse.success(body);
    }
}
