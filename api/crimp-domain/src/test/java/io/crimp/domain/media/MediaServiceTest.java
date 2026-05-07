package io.crimp.domain.media;

import io.crimp.common.config.AppProperties;
import io.crimp.core.entity.enums.MediaKind;
import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.core.entity.enums.MediaUsage;
import io.crimp.core.entity.media.MediaAsset;
import io.crimp.core.entity.media.MediaImage;
import io.crimp.core.entity.media.MediaImageVariant;
import io.crimp.core.entity.media.MediaVideo;
import io.crimp.core.entity.media.MediaVideoThumbnail;
import io.crimp.core.entity.media.MediaVideoVariant;
import io.crimp.core.repository.media.MediaAssetRepository;
import io.crimp.core.repository.media.MediaImageRepository;
import io.crimp.core.repository.media.MediaImageVariantRepository;
import io.crimp.core.repository.media.MediaVideoRepository;
import io.crimp.core.repository.media.MediaVideoThumbnailRepository;
import io.crimp.core.repository.media.MediaVideoVariantRepository;
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
    private MediaImageRepository imageRepo;
    private MediaImageVariantRepository imageVariantRepo;
    private MediaVideoRepository videoRepo;
    private MediaVideoThumbnailRepository videoThumbnailRepo;
    private MediaVideoVariantRepository videoVariantRepo;
    private MediaPresigner presigner;
    private AppProperties appProps;
    private MediaService service;

    @BeforeEach
    void setUp() {
        repo = mock(MediaAssetRepository.class);
        imageRepo = mock(MediaImageRepository.class);
        imageVariantRepo = mock(MediaImageVariantRepository.class);
        videoRepo = mock(MediaVideoRepository.class);
        videoThumbnailRepo = mock(MediaVideoThumbnailRepository.class);
        videoVariantRepo = mock(MediaVideoVariantRepository.class);
        presigner = mock(MediaPresigner.class);
        appProps = new AppProperties("Crimp", "test", null,
                new AppProperties.Media("https://cdn.test", 600));
        service = new MediaService(repo, imageRepo, imageVariantRepo, videoRepo, videoThumbnailRepo, videoVariantRepo, presigner, appProps);

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
        when(imageVariantRepo.findFirstByMediaIdAndStatusAndPrimaryTrueOrderByIdDesc(anyLong(), any(MediaStatus.class)))
                .thenReturn(Optional.empty());
        when(videoVariantRepo.findFirstByMediaIdAndStatusAndPrimaryTrueOrderByIdDesc(anyLong(), any(MediaStatus.class)))
                .thenReturn(Optional.empty());
    }

    @Test
    void presignUpload_image_jpeg_savesUploadingRow_andReturnsPresignedUrl() {
        var result = service.presignUpload(7L, MediaKind.IMAGE, "image/jpeg", 12345L);

        ArgumentCaptor<MediaAsset> captor = ArgumentCaptor.forClass(MediaAsset.class);
        verify(repo).save(captor.capture());
        MediaAsset saved = captor.getValue();
        assertThat(saved.getOwnerUserId()).isEqualTo(7L);
        assertThat(saved.getKind()).isEqualTo(MediaKind.IMAGE);
        assertThat(saved.getUsage()).isEqualTo(MediaUsage.ATTEMPT);
        assertThat(saved.getOriginalMime()).isEqualTo("image/jpeg");
        assertThat(saved.getStatus()).isEqualTo(MediaStatus.UPLOADING);
        // [PR #96] media/users/{userId}/{kind}/YYYY/MM/DD/<extId>.<ext> 구조.
        assertThat(saved.getOriginalPath())
                .startsWith("media/users/7/attempt/image/")
                .matches("media/users/7/attempt/image/\\d{4}/\\d{2}/\\d{2}/[A-Z0-9]{26}\\.jpg");

        assertThat(result.id()).isEqualTo(42L);
        assertThat(result.uploadUrl()).contains(saved.getOriginalPath());
        assertThat(result.expiresAt()).isAfter(Instant.parse("2026-01-01T00:00:00Z"));
        // [PR #90 리뷰 I2] presigner 가 byteSize 를 받았는지 검증.
        verify(presigner).presignPut(eq(saved.getOriginalPath()), eq("image/jpeg"), eq(12345L), any(Duration.class));
    }

    @Test
    void presignUpload_video_mp4_usesVideoFolderAndMp4Extension() {
        service.presignUpload(42L, MediaKind.VIDEO, "video/mp4", 1_000_000L);

        ArgumentCaptor<MediaAsset> captor = ArgumentCaptor.forClass(MediaAsset.class);
        verify(repo).save(captor.capture());
        // usage/kind prefix 로 업로드 의도와 미디어 타입을 같이 드러낸다.
        assertThat(captor.getValue().getOriginalPath())
                .startsWith("media/users/42/attempt/video/")
                .endsWith(".mp4");
    }

    @Test
    void presignUpload_avatar_setsUsageAndAvatarPrefix() {
        service.presignUpload(7L, MediaKind.IMAGE, MediaUsage.AVATAR, "image/png", 12345L);

        ArgumentCaptor<MediaAsset> captor = ArgumentCaptor.forClass(MediaAsset.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getUsage()).isEqualTo(MediaUsage.AVATAR);
        assertThat(captor.getValue().getOriginalPath()).startsWith("media/users/7/avatar/image/");
    }

    @Test
    void presignUpload_avatarVideo_throwsInvalidUsage() {
        assertThatThrownBy(() -> service.presignUpload(7L, MediaKind.VIDEO, MediaUsage.AVATAR, "video/mp4", 1000L))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_USAGE_INVALID");
        verify(repo, never()).save(any());
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

        var result = service.completeUpload(100L, 7L, 12345L, 1920, 1080, null, null);

        assertThat(asset.getStatus()).isEqualTo(MediaStatus.READY);
        assertThat(asset.getOriginalByteSize()).isEqualTo(12345L);
        verify(imageRepo).save(any(MediaImage.class));
        verify(imageVariantRepo).save(any(MediaImageVariant.class));
        assertThat(result.variantPath()).isEqualTo("media/2026-04-28/01HMEDIA.jpg");
        assertThat(result.cdnUrl()).isEqualTo("https://cdn.test/media/2026-04-28/01HMEDIA.jpg");
        assertThat(result.originalPath()).isEqualTo("media/2026-04-28/01HMEDIA.jpg");
    }

    @Test
    void completeUpload_whenTypeRowAlreadyExists_doesNotInsertDuplicate() {
        MediaAsset asset = MediaAsset.createUploading("01HMEDIA", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/2026-04-28/01HMEDIA.jpg");
        setId(asset, 100L);
        when(repo.findById(100L)).thenReturn(Optional.of(asset));
        when(imageRepo.existsById(100L)).thenReturn(true);

        service.completeUpload(100L, 7L, 12345L, 1920, 1080, null, null);

        assertThat(asset.getStatus()).isEqualTo(MediaStatus.READY);
        verify(imageRepo, never()).save(any(MediaImage.class));
        verify(imageVariantRepo).save(any(MediaImageVariant.class));
    }

    @Test
    void completeUpload_whenImageVariantExists_prefersVariantForDisplayCdnUrl() {
        MediaAsset asset = MediaAsset.createUploading("01HMEDIA", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/2026-04-28/01HMEDIA.jpg");
        MediaImageVariant variant = mock(MediaImageVariant.class);
        setId(asset, 100L);
        when(repo.findById(100L)).thenReturn(Optional.of(asset));
        when(variant.getPath()).thenReturn("media/2026-04-28/01HMEDIA.webp");
        when(imageVariantRepo.findFirstByMediaIdAndStatusAndPrimaryTrueOrderByIdDesc(100L, MediaStatus.READY))
                .thenReturn(Optional.of(variant));

        var result = service.completeUpload(100L, 7L, 12345L, 1920, 1080, null, null);

        assertThat(result.originalPath()).isEqualTo("media/2026-04-28/01HMEDIA.jpg");
        assertThat(result.variantPath()).isEqualTo("media/2026-04-28/01HMEDIA.webp");
        assertThat(result.originalUrl()).isEqualTo("https://cdn.test/media/2026-04-28/01HMEDIA.jpg");
        assertThat(result.variantUrl()).isEqualTo("https://cdn.test/media/2026-04-28/01HMEDIA.webp");
        assertThat(result.cdnUrl()).isEqualTo("https://cdn.test/media/2026-04-28/01HMEDIA.webp");
    }

    @Test
    void completeUpload_whenVideoVariantExists_prefersVariantForDisplayCdnUrl() {
        MediaAsset asset = MediaAsset.createUploading("01HMEDIA", 7L, MediaKind.VIDEO,
                "video/mp4", "media/2026-04-28/01HMEDIA.mp4");
        MediaVideoVariant variant = mock(MediaVideoVariant.class);
        setId(asset, 100L);
        when(repo.findById(100L)).thenReturn(Optional.of(asset));
        when(variant.getPath()).thenReturn("media/2026-04-28/01HMEDIA-compressed.mp4");
        when(videoVariantRepo.findFirstByMediaIdAndStatusAndPrimaryTrueOrderByIdDesc(100L, MediaStatus.READY))
                .thenReturn(Optional.of(variant));

        var result = service.completeUpload(100L, 7L, 12345L, 1920, 1080, 5000, null);

        assertThat(result.variantPath()).isEqualTo("media/2026-04-28/01HMEDIA-compressed.mp4");
        assertThat(result.variantUrl()).isEqualTo("https://cdn.test/media/2026-04-28/01HMEDIA-compressed.mp4");
        assertThat(result.cdnUrl()).isEqualTo("https://cdn.test/media/2026-04-28/01HMEDIA-compressed.mp4");
    }

    @Test
    void completeUpload_cdnBaseUrlEmpty_returnsNullCdnUrl() {
        // cdn-base-url 이 비어있으면 응답 cdnUrl=null.
        var noCdnProps = new AppProperties("Crimp", "test", null,
                new AppProperties.Media("", 600));
        var noCdnService = new MediaService(repo, imageRepo, imageVariantRepo, videoRepo, videoThumbnailRepo, videoVariantRepo, presigner, noCdnProps);

        MediaAsset asset = MediaAsset.createUploading("01HMEDIA", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/2026-04-28/01HMEDIA.jpg");
        setId(asset, 100L);
        when(repo.findById(100L)).thenReturn(Optional.of(asset));

        var result = noCdnService.completeUpload(100L, 7L, 12345L, 1920, 1080, null, null);

        assertThat(result.cdnUrl()).isNull();
        assertThat(result.variantPath()).isEqualTo("media/2026-04-28/01HMEDIA.jpg");
        assertThat(result.originalPath()).isEqualTo("media/2026-04-28/01HMEDIA.jpg");
        // entity 자체는 status 만 변경 — URL 은 DB 에 보존하지 않음.
        assertThat(asset.getStatus()).isEqualTo(MediaStatus.READY);
    }

    @Test
    void completeUpload_otherUserMedia_throwsForbidden() {
        MediaAsset asset = MediaAsset.createUploading("01HMEDIA", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/2026-04-28/01HMEDIA.jpg");
        setId(asset, 100L);
        when(repo.findById(100L)).thenReturn(Optional.of(asset));

        assertThatThrownBy(() -> service.completeUpload(100L, 999L, 100L, 1, 1, null, null))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_FORBIDDEN");
        assertThat(asset.getStatus()).isEqualTo(MediaStatus.UPLOADING);
    }

    @Test
    void completeUpload_alreadyReady_throwsInvalidState() {
        MediaAsset asset = MediaAsset.createUploading("01HMEDIA", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/2026-04-28/01HMEDIA.jpg");
        setId(asset, 100L);
        asset.markReady();
        when(repo.findById(100L)).thenReturn(Optional.of(asset));

        assertThatThrownBy(() -> service.completeUpload(100L, 7L, 100L, 1, 1, null, null))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_INVALID_STATE");
    }

    @Test
    void completeUpload_missing_throwsNotFound() {
        when(repo.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.completeUpload(404L, 7L, 100L, 1, 1, null, null))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_NOT_FOUND");
    }

    @Test
    void completeUpload_image_with_posterLink_createsVideoThumbnail() {
        MediaAsset image = MediaAsset.createUploading("01HIMG", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/users/7/image/2026/05/03/01HIMG.jpg");
        setId(image, 200L);
        MediaAsset video = MediaAsset.createUploading("01HVID", 7L, MediaKind.VIDEO,
                "video/mp4", "media/users/7/video/2026/05/03/01HVID.mp4");
        setId(video, 10L);
        video.markReady();

        when(repo.findById(200L)).thenReturn(Optional.of(image));
        when(repo.findById(10L)).thenReturn(Optional.of(video));
        when(videoRepo.existsById(10L)).thenReturn(true);

        service.completeUpload(200L, 7L, 5000L, 1280, 720, null, 10L);

        assertThat(image.getStatus()).isEqualTo(MediaStatus.READY);
        verify(videoThumbnailRepo).clearPrimaryByVideoMediaId(10L);
        verify(videoThumbnailRepo).save(any(MediaVideoThumbnail.class));
    }

    @Test
    void completeUpload_video_with_attachFlag_throws() {
        MediaAsset videoUp = MediaAsset.createUploading("01HVID", 7L, MediaKind.VIDEO,
                "video/mp4", "media/v.mp4");
        setId(videoUp, 10L);
        when(repo.findById(10L)).thenReturn(Optional.of(videoUp));

        assertThatThrownBy(() -> service.completeUpload(10L, 7L, 1000L, null, null, 5000, 99L))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_POSTER_ATTACH_INVALID");
    }

    @Test
    void completeUpload_image_with_attachFlag_selfReference_throws() {
        // mediaId == attachAsPosterForVideoId 자기참조 거부 (PR #123 리뷰 I5).
        MediaAsset image = MediaAsset.createUploading("01HIMG", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/i.jpg");
        setId(image, 200L);
        when(repo.findById(200L)).thenReturn(Optional.of(image));

        assertThatThrownBy(() -> service.completeUpload(200L, 7L, 5000L, 1280, 720, null, 200L))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_POSTER_ATTACH_INVALID");
        // 자기참조는 markReady 전에 거절되어 IMAGE 도 UPLOADING 그대로 (회귀 가드).
        assertThat(image.getStatus()).isEqualTo(MediaStatus.UPLOADING);
    }

    @Test
    void completeUpload_image_with_attachFlag_videoNotFound_throws_andImageStaysUploading() {
        // [PR #123 리뷰 B1 회귀 가드] video 존재 가드를 markReady 전에 미리 검증 →
        // attach 실패 시 IMAGE 가 UPLOADING 으로 동반 롤백 안 됨 (트랜잭션 자체는 롤백되지만
        // 사용자 의도상 IMAGE 라이프사이클이 영향 X 임을 단위 테스트 단에서 명시).
        MediaAsset image = MediaAsset.createUploading("01HIMG", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/i.jpg");
        setId(image, 200L);
        when(repo.findById(200L)).thenReturn(Optional.of(image));
        when(repo.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.completeUpload(200L, 7L, 5000L, 1280, 720, null, 404L))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_NOT_FOUND");
        assertThat(image.getStatus()).isEqualTo(MediaStatus.UPLOADING);
    }

    @Test
    void completeUpload_image_with_attachFlag_videoUploading_throws_andImageStaysUploading() {
        // video 가 아직 READY 가 아니면 attach 거절. IMAGE 는 markReady 호출 전이므로 UPLOADING.
        MediaAsset image = MediaAsset.createUploading("01HIMG", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/i.jpg");
        setId(image, 200L);
        MediaAsset video = MediaAsset.createUploading("01HVID", 7L, MediaKind.VIDEO,
                "video/mp4", "media/v.mp4");
        setId(video, 10L);
        // video 는 UPLOADING 상태 — markReady 호출 X.
        when(repo.findById(200L)).thenReturn(Optional.of(image));
        when(repo.findById(10L)).thenReturn(Optional.of(video));

        assertThatThrownBy(() -> service.completeUpload(200L, 7L, 5000L, 1280, 720, null, 10L))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_POSTER_ATTACH_INVALID");
        assertThat(image.getStatus()).isEqualTo(MediaStatus.UPLOADING);
        verify(videoThumbnailRepo, never()).save(any());
    }

    @Test
    void completeUpload_image_with_attachFlag_videoOtherOwner_throws() {
        // 다른 사용자 video 에 포스터 attach 시도 → MEDIA_FORBIDDEN.
        MediaAsset image = MediaAsset.createUploading("01HIMG", 7L, MediaKind.IMAGE,
                "image/jpeg", "media/i.jpg");
        setId(image, 200L);
        MediaAsset video = MediaAsset.createUploading("01HVID", 999L, MediaKind.VIDEO,
                "video/mp4", "media/v.mp4");
        setId(video, 10L);
        video.markReady();
        when(repo.findById(200L)).thenReturn(Optional.of(image));
        when(repo.findById(10L)).thenReturn(Optional.of(video));

        assertThatThrownBy(() -> service.completeUpload(200L, 7L, 5000L, 1280, 720, null, 10L))
                .isInstanceOf(MediaException.class)
                .hasFieldOrPropertyWithValue("code", "MEDIA_FORBIDDEN");
        assertThat(image.getStatus()).isEqualTo(MediaStatus.UPLOADING);
        verify(videoThumbnailRepo, never()).save(any());
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
