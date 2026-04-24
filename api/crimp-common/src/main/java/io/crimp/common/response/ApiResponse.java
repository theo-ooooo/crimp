package io.crimp.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 모든 API 응답의 공통 envelope.
 *
 * <p>성공 (HTTP 2xx):
 * <pre>
 * { "status": true, "data": &lt;payload&gt; }
 * </pre>
 *
 * <p>실패 (HTTP 4xx/5xx — HTTP status 는 유지):
 * <pre>
 * { "status": false, "error": { "code": "...", "message": "...", "details": {...} } }
 * </pre>
 *
 * <p>리스트 엔드포인트는 `data` 안에 `{ items, page }` 를 담는다:
 * <pre>
 * { "status": true, "data": { "items": [...], "page": { "nextCursor": 10, "size": 20 } } }
 * </pre>
 *
 * <p>`@JsonInclude(NON_NULL)` 로 null 필드(성공 시 error, 실패 시 data) 는 직렬화에서 제외된다.
 *
 * @param <T> 성공 응답 payload 타입
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(boolean status, T data, ErrorBody error) {

    /** 성공 응답. `data` 는 null 허용(예: 204 대체 성공 표시). */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null);
    }

    /** 실패 응답. 호출부에서 HTTP status 는 별도로 `ResponseEntity.status(...)` 로 설정. */
    public static ApiResponse<Void> failure(ErrorBody error) {
        return new ApiResponse<>(false, null, error);
    }
}
