package io.crimp.core.repository.feed;

/**
 * 피드 리포지토리 내부에서 분기 키로 쓰는 enum.
 *
 * <p>도메인 레이어의 {@code FeedFilter} 와 1:1 매핑되지만, 의존 방향(core → common)을 지키기
 * 위해 core 레이어에 별도 정의했다. 매핑은 도메인 서비스가 담당한다.
 */
public enum FeedQueryMode {
    /** 글로벌 SEND/FLASH/ONSIGHT — 좋아요 도메인 도입 전 임시 인기 정렬. */
    POPULAR,
    /** 특정 gymId 시도만 — gymIdFilter 인자가 반드시 채워져야 한다. */
    MY_GYM,
    /** 요청자가 팔로잉 중인 사용자들의 시도. */
    FRIENDS
}
