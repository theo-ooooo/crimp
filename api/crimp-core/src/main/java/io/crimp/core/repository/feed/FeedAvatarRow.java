package io.crimp.core.repository.feed;

/**
 * 피드 작성자 avatar media id 별 대표 이미지 variant path.
 */
public record FeedAvatarRow(
        Long mediaId,
        String variantPath
) {}
