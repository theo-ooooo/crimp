package io.crimp.domain.media;

import io.crimp.common.config.AppProperties;
import io.crimp.core.entity.enums.MediaKind;
import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.core.entity.media.MediaAsset;
import io.crimp.core.repository.media.MediaAssetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.lang.reflect.Field;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@link MediaService} 의 presign / complete 흐름 단위 테스트.
 */
class MediaServiceTest {

    private MediaAssetRepository repo;
    private MediaPresigner presigner;
    private AppProperties appProps;
    private MediaService service;

    @BeforeEach
    void setUp() {
        repo = mock(MediaAssetRepository.class);
        presigner = mock(MediaPresigner.class);
        appProps = new AppProperties("Crimp", "test", null,
                new AppProperties.Media("https://cdn.test", 600));
        service = new MediaService(repo, presigner, appProps);

        // save 는 입력 그대로 반환하면서 id 는 reflection 으로 채워줌 — 도메인 서비스는 id 가 채워진 가정.
        when(repo.save(any(MediaAsset.class))).thenAnswer(inv -> {
            MediaAsset m = inv.getArgument(0);
            setId(m, 42L);
            return m;
        });
        when(presigner.presignPut(anyString(), anyString(), anyLong(), any(Duration.class)))
                .thenAnswer(inv -> new MediaPresigner.PresignedUpload(
                        "https://s3.test/" + inv.getArgument(0) + "?signed",
                        Instant.parse("2026-04-28T14:00:00Z")));
    }

    @Test
    void presignUpload_image_jpeg_savesUploadingRow_andReturnsPresignedUrl() {
        var result = service.presignUpload(7L, MediaKind.IMAGE, "image/jpeg", 12345L);

        ArgumentCaptor<MediaAsset> captor = ArgumentCaptor.forClass(MediaAsset.class);
        verify(repo).save(captor.capture());
        MediaAsset saved = captor.getValue();
        assertThat(saved.getOwnerUserId()).isEqualTo(7L);
        assertThat(saved.getKind()).isEqualTo(MediaKind.IMAGE);
        assertThat(saved.getMime()).isEqualTo("image/jpeg");
        assertThat(saved.getStatus()).isEqualTo(MediaStatus.UPLOADING);
        assertThat(saved.getS3Key()).startsWith("media/").endsWith(".jpg");

        assertThat(result.id()).isEqualTo(42L);
        assertThat(result.uploadUrl()).contains(saved.getS3Key());
        assertThat(result.expiresAt()).isAfter(Instant.parse("2026-01-01T00:00:00Z"));
        // [PR #90 리뷰 I2] presigner 가 byteSize 를 받았는지 검증.
        verify(presigner).presignPut(eq(saved.getS3Key()), eq("image/jpeg"), eq(12345L), any(Duration.class));
    }

    @Test
    void presignUpload_video_mp4_acceptedAndUsesMp4Extension() {
        service.presignUpload(7L, MediaKind.VIDEO, "video/mp4", 1_000_000L);

        ArgumentCaptor<MediaAsset> captor = ArgumentCaptor.forClass(MediaAsset.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getS3Key()).endsWith(".mp4");
    }

    @Test
    void presignUpload_rejectsUnknownMime() {
        assertThatThrownBy(() -> service.presignUpload(7L, MediaKind.IMAGE, "image/svg+xml", 1L))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_MIME_NOT_ALLOWED");
        verify(repo, never()).save(any());
    }

    @Test
    void presignUpload_rejectsImageOver20MB() {
        // [PR #90 리뷰 I2] 이미지 한도(20MB) 초과 → MEDIA_SIZE_TOO_LARGE
        assertThatThrownBy(() -> service.presignUpload(7L, MediaKind.IMAGE, "image/jpeg",
                21L * 1024 * 1024))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_SIZE_TOO_LARGE");
        verify(repo, never()).save(any());
    }

    @Test
    void presignUpload_rejectsVideoOver200MB() {
        assertThatThrownBy(() -> service.presignUpload(7L, MediaKind.VIDEO, "video/mp4",
                201L * 1024 * 1024))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_SIZE_TOO_LARGE");
        verify(repo, never()).save(any());
    }

    @Test
    void presignUpload_rejectsZeroOrNegativeSize() {
        assertThatThrownBy(() -> service.presignUpload(7L, MediaKind.IMAGE, "image/jpeg", 0L))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_SIZE_INVALID");
    }

    @Test
    void completeUpload_marksReady_andComputesCdnUrl() {
        // 영속 상태의 가짜 entity — UPLOADING 으로 시작.
        MediaAsset asset = MediaAsset.createUploading("01HMEDIA", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/2026-04-28/01HMEDIA.jpg");
        setId(asset, 100L);
        when(repo.findById(100L)).thenReturn(Optional.of(asset));

        var result = service.completeUpload(100L, 7L, 12345L, 1920, 1080, null);

        assertThat(asset.getStatus()).isEqualTo(MediaStatus.READY);
        assertThat(asset.getByteSize()).isEqualTo(12345L);
        assertThat(asset.getWidth()).isEqualTo(1920);
        assertThat(asset.getHeight()).isEqualTo(1080);
        assertThat(asset.getCdnUrl()).isEqualTo("https://cdn.test/media/2026-04-28/01HMEDIA.jpg");
        assertThat(result.cdnUrl()).isEqualTo(asset.getCdnUrl());
        // [PR #90 리뷰 I1] s3Key 가 응답에 노출되어 클라가 cdnUrl null 케이스에서 별도 처리 가능.
        assertThat(result.s3Key()).isEqualTo("media/2026-04-28/01HMEDIA.jpg");
    }

    @Test
    void completeUpload_cdnBaseUrlEmpty_returnsNullCdnUrl() {
        // [PR #90 리뷰 I1] cdn-base-url 이 비어있으면 cdnUrl=null. raw s3Key 가 클라에서 fetch URL 로
        // 잘못 사용되는 사고 방지.
        var noCdnProps = new AppProperties("Crimp", "test", null,
                new AppProperties.Media("", 600));
        var noCdnService = new MediaService(repo, presigner, noCdnProps);

        MediaAsset asset = MediaAsset.createUploading("01HMEDIA", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/2026-04-28/01HMEDIA.jpg");
        setId(asset, 100L);
        when(repo.findById(100L)).thenReturn(Optional.of(asset));

        var result = noCdnService.completeUpload(100L, 7L, 12345L, 1920, 1080, null);

        assertThat(result.cdnUrl()).isNull();
        assertThat(result.s3Key()).isEqualTo("media/2026-04-28/01HMEDIA.jpg");
        assertThat(asset.getCdnUrl()).isNull();
    }

    @Test
    void completeUpload_otherUserMedia_throwsForbidden() {
        MediaAsset asset = MediaAsset.createUploading("01HMEDIA", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/2026-04-28/01HMEDIA.jpg");
        setId(asset, 100L);
        when(repo.findById(100L)).thenReturn(Optional.of(asset));

        assertThatThrownBy(() -> service.completeUpload(100L, 999L, 100L, 1, 1, null))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_FORBIDDEN");
        assertThat(asset.getStatus()).isEqualTo(MediaStatus.UPLOADING);
    }

    @Test
    void completeUpload_alreadyReady_throwsInvalidState() {
        MediaAsset asset = MediaAsset.createUploading("01HMEDIA", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/2026-04-28/01HMEDIA.jpg");
        setId(asset, 100L);
        asset.markReady("https://cdn.test/...", null, null);
        when(repo.findById(100L)).thenReturn(Optional.of(asset));

        assertThatThrownBy(() -> service.completeUpload(100L, 7L, 100L, 1, 1, null))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_INVALID_STATE");
    }

    @Test
    void completeUpload_missing_throwsNotFound() {
        when(repo.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.completeUpload(404L, 7L, 100L, 1, 1, null))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_NOT_FOUND");
    }

    private static void setId(MediaAsset target, long id) {
        try {
            Field f = MediaAsset.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(target, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
