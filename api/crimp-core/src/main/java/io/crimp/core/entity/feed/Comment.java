package io.crimp.core.entity.feed;

import io.crimp.core.base.SoftDeletableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "comments")
@NoArgsConstructor(access = PROTECTED)
public class Comment extends SoftDeletableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, length = 26, unique = true, updatable = false)
    private String extId;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "content", nullable = false, length = 1000)
    private String content;

    private Comment(String extId, Long postId, Long userId, Long parentId, String content) {
        this.extId = extId;
        this.postId = postId;
        this.userId = userId;
        this.parentId = parentId;
        this.content = content;
    }

    public static Comment create(String extId, Long postId, Long userId, Long parentId, String content) {
        return new Comment(extId, postId, userId, parentId, content);
    }

    public void updateContent(String content) {
        this.content = content;
    }
}
