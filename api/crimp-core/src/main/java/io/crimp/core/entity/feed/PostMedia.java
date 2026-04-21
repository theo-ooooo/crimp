package io.crimp.core.entity.feed;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Entity
@Getter
@Table(name = "post_media")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostMedia {

    @EmbeddedId
    private PostMediaId id;

    @Column(name = "seq", nullable = false)
    private Short seq;

    private PostMedia(PostMediaId id, int seq) {
        this.id = id;
        this.seq = (short) seq;
    }

    public static PostMedia attach(Long postId, Long mediaId, int seq) {
        return new PostMedia(new PostMediaId(postId, mediaId), seq);
    }

    @Embeddable
    @Getter
    @EqualsAndHashCode
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class PostMediaId implements Serializable {
        @Column(name = "post_id")
        private Long postId;
        @Column(name = "media_id")
        private Long mediaId;

        public PostMediaId(Long postId, Long mediaId) {
            this.postId = postId;
            this.mediaId = mediaId;
        }
    }
}
