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

    /**
     * Per-kind 사이즈 한도 (PR #90 리뷰 I2 — 1차 방어선). 클라가 declare 한 byteSize 가
     * 한도 초과면 presign 단계에서 거부. 추가 방어는 S3 버킷 정책의 max object size 권장.
     */
    private static final long IMAGE_MAX_BYTES = 20L * 1024 * 1024;   //  20MB
    private static final long VIDEO_MAX_BYTES = 200L * 1024 * 1024;  // 200MB

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
     *
     * @param byteSize 클라가 업로드할 정확한 바이트 크기 (PR #90 리뷰 I2). presigned URL 의 서명에
     *                 contentLength 로 박혀, 클라가 다른 크기로 PUT 시 S3 가 거부.
     */
    @Transactional
    public PresignResult presignUpload(long ownerUserId, MediaKind kind, String mime, long byteSize) {
        validateMime(kind, mime);
        validateSize(kind, byteSize);
        String extId = UlidGenerator.next();
        String s3Key = buildS3Key(ownerUserId, kind, extId, mime);

        MediaAsset asset = MediaAsset.createUploading(extId, ownerUserId, kind, mime, s3Key);
        mediaAssetRepository.save(asset);

        Duration ttl = Duration.ofSeconds(appProperties.media().presignedUrlTtlSeconds());
        MediaPresigner.PresignedUpload presigned = presigner.presignPut(s3Key, mime, byteSize, ttl);

        log.info("[media] presign issued id={} extId={} owner={} kind={} mime={} bytes={}",
                asset.getId(), extId, ownerUserId, kind, mime, byteSize);
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
                asset.getS3Key(), cdnUrl, asset.getThumbnailCdnUrl(), asset.getCreatedAt());
    }

    private void validateMime(MediaKind kind, String mime) {
        Set<String> allowed = (kind == MediaKind.IMAGE) ? ALLOWED_IMAGE_MIME : ALLOWED_VIDEO_MIME;
        if (mime == null || !allowed.contains(mime.toLowerCase())) {
            throw new MediaException("MEDIA_MIME_NOT_ALLOWED",
                    "Mime " + mime + " is not allowed for " + kind);
        }
    }

    private void validateSize(MediaKind kind, long byteSize) {
        long max = (kind == MediaKind.IMAGE) ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
        if (byteSize <= 0) {
            throw new MediaException("MEDIA_SIZE_INVALID",
                    "byteSize must be positive (was " + byteSize + ")");
        }
        if (byteSize > max) {
            throw new MediaException("MEDIA_SIZE_TOO_LARGE",
                    "byteSize " + byteSize + " exceeds limit for " + kind + " (" + max + ")");
        }
    }

    /**
     * S3 키 패턴 (PR #96 — 폴더 구조 개선):
     * {@code media/users/{ownerUserId}/{kind}/YYYY/MM/DD/<extId>.<ext>}
     *
     * <p>예: {@code media/users/123/image/2026/04/29/01HABC...DEF.jpg}
     *
     * <p>설계 의도:
     * <ul>
     *   <li><b>users/{userId}</b> — 사용자별 그룹핑. 콘솔에서 특정 사용자 미디어 즉시 탐색 가능,
     *       향후 사용자 삭제 시 prefix 단위로 일괄 정리 (S3 lifecycle 또는 batch delete).</li>
     *   <li><b>{kind}</b> — image / video 분리. video 만 별도 lifecycle (예: 30일 후 IA 티어로
     *       이동) 적용 가능.</li>
     *   <li><b>YYYY/MM/DD 계층</b> — 운영 분석 시 콘솔 탐색이 깔끔. 단일 prefix 의 객체 수가
     *       너무 많아지면 S3 partition split 효율↓ — 일·월 분리로 자연스럽게 균형.</li>
     *   <li><b>extId leaf</b> — ULID 라 같은 일자 내 정렬·중복 방지 보장.</li>
     * </ul>
     */
    private static String buildS3Key(long ownerUserId, MediaKind kind, String extId, String mime) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        String yyyy = String.format("%04d", today.getYear());
        String mm = String.format("%02d", today.getMonthValue());
        String dd = String.format("%02d", today.getDayOfMonth());
        String ext = guessExtension(mime);
        String kindSegment = kind.name().toLowerCase(); // IMAGE → image, VIDEO → video
        return "media/users/" + ownerUserId + "/" + kindSegment + "/"
                + yyyy + "/" + mm + "/" + dd + "/"
                + extId + (ext.isEmpty() ? "" : "." + ext);
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

    /**
     * [PR #90 리뷰 I1] cdn-base-url 미설정 시 null 반환 — 클라가 raw s3Key 를 fetch URL 로
     * 잘못 사용하는 사고 방지. 응답은 cdnUrl/s3Key 둘 다 노출하므로 클라는 cdnUrl 이 null 이면
     * 별도 처리 (예: 자체 사이닝 GET URL 발급, 로컬은 직접 합성 등) 한다.
     */
    private String buildCdnUrl(String s3Key) {
        String base = appProperties.media().cdnBaseUrl();
        if (base == null || base.isBlank()) {
            return null;
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
            String s3Key, String cdnUrl, String thumbnailCdnUrl, Instant createdAt
    ) {}
}
