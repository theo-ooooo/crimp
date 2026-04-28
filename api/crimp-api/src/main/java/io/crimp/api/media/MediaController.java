package io.crimp.api.media;

import io.crimp.api.security.CrimpPrincipal;
import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.core.entity.enums.MediaKind;
import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.domain.media.MediaException;
import io.crimp.domain.media.MediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/**
 * 미디어 업로드 API (PR #90, F5 카메라 캡처 인프라).
 *
 * <p>두 단계 흐름:
 * <ol>
 *   <li>{@code POST /presign} — 업로드 시작. presigned PUT URL + UPLOADING 상태 row 발급.</li>
 *   <li>(클라가 받은 URL 로 직접 S3 PUT 업로드)</li>
 *   <li>{@code POST /{id}/complete} — 업로드 완료 보고. READY 로 전환 + cdnUrl 채워짐.</li>
 * </ol>
 *
 * <p>인증: {@link CrimpPrincipal} 필수. {@code complete} 는 본인 소유 미디어만 갱신 가능
 * — 타인의 UPLOADING row 를 강제 READY 시도하면 {@code MEDIA_FORBIDDEN} 403.
 */
@Tag(name = "Media", description = "미디어 업로드 (presigned URL 기반)")
@RestController
@RequestMapping("/api/v1/media")
@Profile("!test")
public class MediaController {

    private final MediaService mediaService;

    public MediaController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    @Operation(
            summary = "업로드 시작 (presigned URL 발급)",
            description = "UPLOADING 상태 row 생성 후 클라가 S3 로 직접 PUT 할 수 있는 presigned URL 반환. "
                    + "응답의 uploadUrl 로 PUT 호출 시 Content-Type 헤더 + Content-Length 가 요청 값과 정확히 일치해야 한다 (서명 일치)."
    )
    @PostMapping("/presign")
    public PresignResponse presign(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @Valid @RequestBody PresignRequest req) {
        MediaKind kind = parseKind(req.kind());
        var result = mediaService.presignUpload(principal.userId(), kind, req.mime(), req.byteSize());
        return new PresignResponse(
                result.id(), result.extId(),
                result.uploadUrl(), result.s3Key(),
                result.expiresAt(), result.mime());
    }

    @Operation(
            summary = "업로드 완료 보고",
            description = "S3 PUT 성공 후 호출. byteSize/width/height/durationMs 메타 + READY 전환. "
                    + "본인 소유가 아닌 미디어 호출 시 403 MEDIA_FORBIDDEN. UPLOADING 외 상태에서 호출 시 409. "
                    + "응답의 cdnUrl 은 cdn-base-url 미설정 시 null — 그 경우 클라는 s3Key 를 통해 별도 처리."
    )
    @PostMapping("/{id}/complete")
    public CompleteResponse complete(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable long id,
            @Valid @RequestBody CompleteRequest req) {
        var result = mediaService.completeUpload(
                id, principal.userId(),
                req.byteSize(), req.width(), req.height(), req.durationMs());
        return new CompleteResponse(
                result.id(), result.extId(), result.kind().name(), result.status().name(),
                result.mime(), result.byteSize(),
                result.width(), result.height(), result.durationMs(),
                result.s3Key(), result.cdnUrl(), result.thumbnailCdnUrl(), result.createdAt());
    }

    @ExceptionHandler(MediaException.class)
    public ResponseEntity<ApiResponse<Void>> handleMedia(MediaException e) {
        HttpStatus status = switch (e.code()) {
            case "MEDIA_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "MEDIA_FORBIDDEN" -> HttpStatus.FORBIDDEN;
            case "MEDIA_INVALID_STATE" -> HttpStatus.CONFLICT;
            case "MEDIA_SIZE_TOO_LARGE" -> HttpStatus.PAYLOAD_TOO_LARGE;
            case "MEDIA_MIME_NOT_ALLOWED", "MEDIA_KIND_INVALID", "MEDIA_SIZE_INVALID" -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.UNPROCESSABLE_ENTITY;
        };
        return ResponseEntity.status(status)
                .body(ApiResponse.failure(ErrorBody.of(e.code(), e.getMessage())));
    }

    private static MediaKind parseKind(String raw) {
        try {
            return MediaKind.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new MediaException("MEDIA_KIND_INVALID", "Unknown media kind: " + raw);
        }
    }

    public record PresignRequest(
            @NotBlank String kind,
            @NotBlank String mime,
            // [PR #90 리뷰 I2] 클라가 업로드할 정확한 byteSize 를 미리 선언 — presigned URL 의 서명에
            // 박혀 다른 크기 PUT 시 S3 거부. service 레이어가 추가로 per-kind 한도(image 20MB, video 200MB)
            // 검증 → MEDIA_SIZE_TOO_LARGE 413 / MEDIA_SIZE_INVALID 400.
            @NotNull @Min(1) @Max(2_000_000_000L) Long byteSize
    ) {}

    public record PresignResponse(
            long id, String extId, String uploadUrl, String s3Key,
            Instant expiresAt, String mime
    ) {}

    public record CompleteRequest(
            @NotNull @PositiveOrZero @Max(2_000_000_000L) Long byteSize,
            @Min(0) @Max(20000) Integer width,
            @Min(0) @Max(20000) Integer height,
            @Min(0) @Max(3_600_000) Integer durationMs
    ) {}

    public record CompleteResponse(
            long id, String extId, String kind, String status, String mime,
            Long byteSize, Integer width, Integer height, Integer durationMs,
            // [PR #90 리뷰 I1] cdnUrl 은 cdn-base-url 미설정 시 null — 클라는 s3Key 를 별도 활용.
            String s3Key, String cdnUrl, String thumbnailCdnUrl, Instant createdAt
    ) {}
}
