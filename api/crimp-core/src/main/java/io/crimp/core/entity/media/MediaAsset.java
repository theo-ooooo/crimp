package io.crimp.core.entity.media;

import io.crimp.core.entity.enums.MediaKind;
import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.core.entity.enums.MediaUsage;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "media_assets")
@NoArgsConstructor(access = PROTECTED)
public class MediaAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, columnDefinition = "char(26)", unique = true, updatable = false)
    private String extId;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(name = "kind", nullable = false)
    private MediaKind kind;

    @Column(name = "status", nullable = false)
    private MediaStatus status;

    @Column(name = "usage_type", nullable = false)
    private MediaUsage usage;

    @Column(name = "mime", nullable = false, length = 80)
    private String originalMime;

    @Column(name = "byte_size")
    private Long originalByteSize;

    @Column(name = "original_path", nullable = false, length = 500)
    private String originalPath;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    private MediaAsset(String extId, Long ownerUserId, MediaKind kind, MediaUsage usage, String originalMime, String originalPath) {
        this.extId = extId;
        this.ownerUserId = ownerUserId;
        this.kind = kind;
        this.status = MediaStatus.UPLOADING;
        this.usage = usage;
        this.originalMime = originalMime;
        this.originalPath = originalPath;
    }

    public static MediaAsset createUploading(String extId, Long ownerUserId, MediaKind kind, String mime, String originalPath) {
        return createUploading(extId, ownerUserId, kind, MediaUsage.ATTEMPT, mime, originalPath);
    }

    public static MediaAsset createUploading(
            String extId,
            Long ownerUserId,
            MediaKind kind,
            MediaUsage usage,
            String mime,
            String originalPath) {
        return new MediaAsset(extId, ownerUserId, kind, usage, mime, originalPath);
    }

    public void markProcessing() { this.status = MediaStatus.PROCESSING; }
    public void markReady() {
        this.status = MediaStatus.READY;
    }
    public void markFailed() { this.status = MediaStatus.FAILED; }

    /**
     * 업로드 완료 후 클라가 보고하는 메타데이터 적용 (PR #90, F5). null 인 필드는 변경하지 않음 —
     * 영상은 width/height 가 클라 측 plugin 에 따라 누락될 수 있고, 이미지는 durationMs 가 항상 null.
     */
    public void applyUploadedMeta(Long byteSize) {
        if (byteSize != null) this.originalByteSize = byteSize;
    }
}
