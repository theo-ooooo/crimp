package io.crimp.api.media;

import io.crimp.api.media.MediaController.CompleteRequest;
import io.crimp.api.media.MediaController.CompleteResponse;
import io.crimp.api.media.MediaController.PresignRequest;
import io.crimp.api.media.MediaController.PresignResponse;
import io.crimp.api.security.CrimpPrincipal;
import io.crimp.common.response.ApiResponse;
import io.crimp.core.entity.enums.MediaKind;
import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.domain.media.MediaException;
import io.crimp.domain.media.MediaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@link MediaController} 메서드 단위 테스트.
 *
 * <p>{@code @Profile("!test")} 컨트롤러를 직접 인스턴스화 — Spring Security 가드는 본 테스트
 * 범위 X (SecurityConfig + JwtAuthenticationFilter 별도 테스트로 보증).
 */
class MediaControllerTest {

    private static final CrimpPrincipal USER = new CrimpPrincipal(7L, "01HUSER");

    private MediaService service;
    private MediaController controller;

    @BeforeEach
    void setUp() {
        service = mock(MediaService.class);
        controller = new MediaController(service);
    }

    @Test
    void presign_image_jpeg_returnsUploadUrl() {
        when(service.presignUpload(eq(7L), eq(MediaKind.IMAGE), eq("image/jpeg")))
                .thenReturn(new MediaService.PresignResult(
                        42L, "01HMEDIA", "https://s3.test/presigned",
                        "media/2026-04-28/01HMEDIA.jpg",
                        Instant.parse("2026-04-28T14:00:00Z"), "image/jpeg"));

        PresignResponse res = controller.presign(USER, new PresignRequest("IMAGE", "image/jpeg"));

        assertThat(res.id()).isEqualTo(42L);
        assertThat(res.uploadUrl()).isEqualTo("https://s3.test/presigned");
        assertThat(res.s3Key()).startsWith("media/");
    }

    @Test
    void presign_invalidKind_returnsBadRequest() {
        ResponseEntity<ApiResponse<Void>> res = controller.handleMedia(
                new MediaException("MEDIA_KIND_INVALID", "Unknown media kind: AUDIO"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(res.getBody().error().code()).isEqualTo("MEDIA_KIND_INVALID");
    }

    @Test
    void complete_returnsCdnUrl() {
        when(service.completeUpload(eq(42L), eq(7L), eq(12345L), eq(1920), eq(1080), eq(null)))
                .thenReturn(new MediaService.CompleteResult(
                        42L, "01HMEDIA", MediaKind.IMAGE, MediaStatus.READY,
                        "image/jpeg", 12345L, 1920, 1080, null,
                        "https://cdn.test/media/2026-04-28/01HMEDIA.jpg", null,
                        Instant.parse("2026-04-28T13:00:00Z")));

        CompleteResponse res = controller.complete(USER, 42L,
                new CompleteRequest(12345L, 1920, 1080, null));

        assertThat(res.id()).isEqualTo(42L);
        assertThat(res.status()).isEqualTo("READY");
        assertThat(res.cdnUrl()).isEqualTo("https://cdn.test/media/2026-04-28/01HMEDIA.jpg");
        verify(service).completeUpload(42L, 7L, 12345L, 1920, 1080, null);
    }

    @Test
    void handleMedia_forbidden_returns403() {
        ResponseEntity<ApiResponse<Void>> res = controller.handleMedia(
                new MediaException("MEDIA_FORBIDDEN", "x"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void handleMedia_invalidState_returns409() {
        ResponseEntity<ApiResponse<Void>> res = controller.handleMedia(
                new MediaException("MEDIA_INVALID_STATE", "x"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void handleMedia_notFound_returns404() {
        ResponseEntity<ApiResponse<Void>> res = controller.handleMedia(
                new MediaException("MEDIA_NOT_FOUND", "x"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
