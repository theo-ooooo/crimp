package io.crimp.api.social.dto;

import io.crimp.domain.social.LikeToggleResult;

/**
 * 좋아요 토글 응답.
 */
public record LikeToggleResponse(boolean liked, long likeCount) {
    public static LikeToggleResponse of(LikeToggleResult r) {
        return new LikeToggleResponse(r.liked(), r.likeCount());
    }
}
