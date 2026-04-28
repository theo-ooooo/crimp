package io.crimp.domain.media;

import io.crimp.common.config.AppProperties;
import io.crimp.common.id.UlidGenerator;
import io.crimp.core.entity.enums.MediaKind;
import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.core.entity.media.MediaAsset;
import io.crimp.core.repository.media.MediaAssetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Set;

/**
 * 미디어 업로드 라이프사이클 도메인 서비스 (PR #90, F5 카메라 캡처 인프라).
 *
 * <p>Phase 1 MVP 흐름:
 * <ol>
 *   <li>{@link #presignUpload(long, MediaKind, String)} — 클라가 호출, S3 PUT URL + UPLOADING row 발급</li>
 *   <li>클라가 받은 URL 로 직접 업로드 (백엔드 경유 X)</li>
 *   <li>{@link #completeUpload(long, long, Long, Integer, Integer, Integer)} — 클라가 업로드 완료
 *       알림 + 메타데이터 (size/dim/duration). row 가 READY 로 전환되며 {@code cdn_url} 채워짐.</li>
 * </ol>
 *
 * <p>Phase 1 단순화: 영상도 PROCESSING 단계 없이 UPLOADING → READY 직행. 트랜스코드(MediaConvert)
 * 는 별도 PR 에서 추가 (Phase 1.5).
 */
@Service
@org.springframework.context.annotation.Profile("!test")
public class MediaService {

    private static final Logger log = LoggerFactory.getLogger(MediaService.class);

    /** 업로드 허용 MIME — 외부 입력이라 명시 화이트리스트로 제한. */
    private static final Set<String> ALLOWED_IMAGE_MIME = Set.of(
            "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp");
    private static final Set<String> ALLOWED_VIDEO_MIME = Set.of(
            "video/mp4", "video/quicktime");

    private final MediaAssetRepository mediaAssetRepository;
    private final MediaPresigner presigner;
    private final AppProperties appProperties;

    public MediaService(MediaAssetRepository mediaAssetRepository,
                        MediaPresigner presigner,
                        AppProperties appProperties) {
        this.mediaAssetRepository = mediaAssetRepository;
        this.presigner = presigner;
        this.appProperties = appProperties;
    }

    /**
     * 업로드 시작 — UPLOADING row 생성 후 presigned PUT URL 발급.
     */
    @Transactional
    public PresignResult presignUpload(long ownerUserId, MediaKind kind, String mime) {
        validateMime(kind, mime);
        String extId = UlidGenerator.next();
        String s3Key = buildS3Key(extId, mime);

        MediaAsset asset = MediaAsset.createUploading(extId, ownerUserId, kind, mime, s3Key);
        mediaAssetRepository.save(asset);

        Duration ttl = Duration.ofSeconds(appProperties.media().presignedUrlTtlSeconds());
        MediaPresigner.PresignedUpload presigned = presigner.presignPut(s3Key, mime, ttl);

        log.info("[media] presign issued id={} extId={} owner={} kind={} mime={}",
                asset.getId(), extId, ownerUserId, kind, mime);
        return new PresignResult(
                asset.getId(), extId,
                presigned.url(),
                s3Key,
                presigned.expiresAt(),
                mime);
    }

    /**
     * 업로드 완료 — 클라가 S3 PUT 성공 후 호출. 메타 업데이트 + READY 전환 + cdnUrl 계산.
     *
     * @throws MediaException {@code MEDIA_NOT_FOUND}/{@code MEDIA_FORBIDDEN}/{@code MEDIA_INVALID_STATE}
     */
    @Transactional
    public CompleteResult completeUpload(long mediaId, long callerUserId,
                                         Long byteSize, Integer width, Integer height, Integer durationMs) {
        MediaAsset asset = mediaAssetRepository.findById(mediaId)
                .orElseThrow(() -> new MediaException("MEDIA_NOT_FOUND", "Media not found: " + mediaId));
        if (asset.getOwnerUserId() != callerUserId) {
            // 다른 사용자의 미디어를 강제로 READY 로 만들지 못하게 차단.
            throw new MediaException("MEDIA_FORBIDDEN", "Caller does not own media " + mediaId);
        }
        if (asset.getStatus() != MediaStatus.UPLOADING) {
            throw new MediaException("MEDIA_INVALID_STATE",
                    "Media " + mediaId + " is not in UPLOADING (was " + asset.getStatus() + ")");
        }

        asset.applyUploadedMeta(byteSize, width, height, durationMs);

        String cdnUrl = buildCdnUrl(asset.getS3Key());
        asset.markReady(cdnUrl, null, null);

        log.info("[media] upload complete id={} extId={} owner={} byteSize={} dim={}x{} duration={}ms",
                asset.getId(), asset.getExtId(), callerUserId, byteSize, width, height, durationMs);
        return new CompleteResult(
                asset.getId(), asset.getExtId(), asset.getKind(), asset.getStatus(),
                asset.getMime(), asset.getByteSize(),
                asset.getWidth(), asset.getHeight(), asset.getDurationMs(),
                cdnUrl, asset.getThumbnailCdnUrl(), asset.getCreatedAt());
    }

    private void validateMime(MediaKind kind, String mime) {
        Set<String> allowed = (kind == MediaKind.IMAGE) ? ALLOWED_IMAGE_MIME : ALLOWED_VIDEO_MIME;
        if (mime == null || !allowed.contains(mime.toLowerCase())) {
            throw new MediaException("MEDIA_MIME_NOT_ALLOWED",
                    "Mime " + mime + " is not allowed for " + kind);
        }
    }

    /** 키 패턴: {@code media/YYYY-MM-DD/<extId>.<ext>} — 일자별 prefix 로 운영 분석·라이프사이클 적용 용이. */
    private static String buildS3Key(String extId, String mime) {
        String date = LocalDate.now(ZoneOffset.UTC).toString();
        String ext = guessExtension(mime);
        return "media/" + date + "/" + extId + (ext.isEmpty() ? "" : "." + ext);
    }

    private static String guessExtension(String mime) {
        // 확장자는 운영 디버깅 편의용 — 클라가 cdnUrl 을 그대로 쓰므로 정확도 요구 X.
        if (mime == null) return "";
        return switch (mime.toLowerCase()) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/heic" -> "heic";
            case "image/heif" -> "heif";
            case "image/webp" -> "webp";
            case "video/mp4" -> "mp4";
            case "video/quicktime" -> "mov";
            default -> "";
        };
    }

    private String buildCdnUrl(String s3Key) {
        String base = appProperties.media().cdnBaseUrl();
        if (base == null || base.isBlank()) {
            // CDN 미설정 (로컬·테스트) — s3Key 만 노출하고 클라가 직접 적절한 URL 로 합성.
            return s3Key;
        }
        return base.endsWith("/") ? base + s3Key : base + "/" + s3Key;
    }

    public record PresignResult(
            long id, String extId, String uploadUrl, String s3Key,
            Instant expiresAt, String mime
    ) {}

    public record CompleteResult(
            long id, String extId, MediaKind kind, MediaStatus status, String mime,
            Long byteSize, Integer width, Integer height, Integer durationMs,
            String cdnUrl, String thumbnailCdnUrl, Instant createdAt
    ) {}
}
