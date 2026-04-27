package io.crimp.domain.social;

/**
 * 좋아요 토글 결과 뷰.
 *
 * @param liked     토글 후 상태 (like→true, unlike→false)
 * @param likeCount 토글 후 카운트
 */
public record LikeToggleResult(boolean liked, long likeCount) {}
