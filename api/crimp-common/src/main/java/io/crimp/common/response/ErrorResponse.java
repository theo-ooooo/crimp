package io.crimp.common.response;

import java.util.Map;

/**
 * 모든 에러 응답의 공통 envelope.
 * <pre>
 * { "error": { "code": "AUTH_INVALID", "message": "...", "details": { ... } } }
 * </pre>
 */
public record ErrorResponse(ErrorBody error) {

    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(new ErrorBody(code, message, null));
    }

    public static ErrorResponse of(String code, String message, Map<String, Object> details) {
        return new ErrorResponse(new ErrorBody(code, message, details));
    }

    public record ErrorBody(String code, String message, Map<String, Object> details) {}
}
