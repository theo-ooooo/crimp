package io.crimp.core.entity.media;

import io.crimp.core.entity.enums.MediaStatus;
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
@Table(name = "media_video_thumbnails")
@NoArgsConstructor(access = PROTECTED)
public class MediaVideoThumbnail {

    public static final byte SOURCE_GENERATED = 1;
    public static final byte SOURCE_USER_SELECTED = 2;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "video_media_id", nullable = false)
    private Long videoMediaId;

    @Column(name = "image_media_id")
    private Long imageMediaId;

    @Column(name = "path", length = 500)
    private String path;

    @Column(name = "mime", length = 80)
    private String mime;

    @Column(name = "byte_size")
    private Long byteSize;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "source_type", nullable = false)
    private Byte sourceType;

    @Column(name = "status", nullable = false)
    private MediaStatus status;

    @Column(name = "is_primary", nullable = false)
    private Boolean primary;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    private MediaVideoThumbnail(Long videoMediaId, Long imageMediaId) {
        this.videoMediaId = videoMediaId;
        this.imageMediaId = imageMediaId;
        this.sourceType = SOURCE_USER_SELECTED;
        this.status = MediaStatus.READY;
        this.primary = true;
    }

    public static MediaVideoThumbnail userSelected(Long videoMediaId, Long imageMediaId) {
        return new MediaVideoThumbnail(videoMediaId, imageMediaId);
    }
}
