package io.crimp.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/**
 * 에러 상세 정보 envelope 의 `error` 필드.
 *
 * <pre>
 * {
 *   "code": "AUTH_EXPIRED",
 *   "message": "Access token expired",
 *   "details": { "field": "token" }
 * }
 * </pre>
 *
 * {@link ApiResponse#failure(ErrorBody)} 와 함께 사용한다.
 *
 * `details` 가 null 이면 JSON 직렬화에서 제외한다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorBody(String code, String message, Map<String, Object> details) {

    /** `details` 없이 코드·메시지만 담는 편의 팩터리. */
    public static ErrorBody of(String code, String message) {
        return new ErrorBody(code, message, null);
    }

    public static ErrorBody of(String code, String message, Map<String, Object> details) {
        return new ErrorBody(code, message, details);
    }
}
