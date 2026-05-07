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
@Table(name = "media_images")
@NoArgsConstructor(access = PROTECTED)
public class MediaImage {

    @Id
    @Column(name = "media_id")
    private Long mediaId;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    private MediaImage(Long mediaId, Integer width, Integer height) {
        this.mediaId = mediaId;
        this.width = width;
        this.height = height;
    }

    public static MediaImage create(Long mediaId, Integer width, Integer height) {
        return new MediaImage(mediaId, width, height);
    }
}
