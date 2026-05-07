package io.crimp.core.entity.media;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "media_videos")
@NoArgsConstructor(access = PROTECTED)
public class MediaVideo {

    @Id
    @Column(name = "media_id")
    private Long mediaId;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "duration_ms")
    private Integer durationMs;

    private MediaVideo(Long mediaId, Integer width, Integer height, Integer durationMs) {
        this.mediaId = mediaId;
        this.width = width;
        this.height = height;
        this.durationMs = durationMs;
    }

    public static MediaVideo create(Long mediaId, Integer width, Integer height, Integer durationMs) {
        return new MediaVideo(mediaId, width, height, durationMs);
    }
}
