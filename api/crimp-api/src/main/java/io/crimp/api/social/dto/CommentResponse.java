package io.crimp.api.social.dto;

import io.crimp.domain.social.CommentView;

import java.time.Instant;

/**
 * 댓글 응답.
 */
public record CommentResponse(
        String extId,
        String userExtId,
        String userNickname,
        int avatarColorHue,
        String content,
        Instant createdAt,
        String parentExtId
) {
    public static CommentResponse of(CommentView v) {
        return new CommentResponse(
                v.extId(),
                v.userExtId(),
                v.userNickname(),
                v.avatarColorHue(),
                v.content(),
                v.createdAt(),
                v.parentExtId());
    }
}
