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
@Table(name = "media_image_variants")
@NoArgsConstructor(access = PROTECTED)
public class MediaImageVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "media_id", nullable = false)
    private Long mediaId;

    @Column(name = "variant_type", nullable = false)
    private Byte variantType;

    @Column(name = "status", nullable = false)
    private MediaStatus status;

    @Column(name = "mime", nullable = false, length = 80)
    private String mime;

    @Column(name = "byte_size")
    private Long byteSize;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "path", nullable = false, length = 500)
    private String path;

    @Column(name = "is_primary", nullable = false)
    private Boolean primary;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
