package io.crimp.api.social.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 댓글 작성 요청.
 *
 * @param content      본문 (1..1000)
 * @param parentExtId  대댓글이면 부모 ext_id, 일반 댓글이면 null
 */
public record CreateCommentRequest(
        @NotBlank @Size(max = 1000) String content,
        String parentExtId
) {}
