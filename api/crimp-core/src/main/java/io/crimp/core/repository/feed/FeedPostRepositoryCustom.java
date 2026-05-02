package io.crimp.core.repository.feed;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.util.Collection;
import java.util.List;

/**
 * 피드(FeedPost 기반 projection) 커서 페이지네이션 쿼리.
 *
 * <p>구현은 {@link FeedPostRepositoryCustomImpl} 에 있다. {@code @Profile("!test")} —
 * 테스트 프로파일에서는 JPA autoconfig 가 비활성이라 {@code JPAQueryFactory} 빈이 없다.
 *
 * <p>이전 PR #53 의 {@code FeedRepositoryCustom} 은 SessionAttempt 위 view-projection
 * 이었고, 이를 FeedPost 루팅으로 교체하면서 동명 표면을 본 인터페이스로 흡수했다.
 */
public interface FeedPostRepositoryCustom {

    /**
     * 피드 조회.
     *
     * <p>정렬은 {@code FeedPost.id DESC} 고정 — 시도 자동 게시가 시도 기록 시점에 발생하므로
     * 시도 logged_at 과 단조성이 일치하면서도 surrogate id 가 안정적인 커서를 제공한다.
     *
     * <p>fetch 패턴: {@code pageSize + 1} 개를 가져와 hasNext 를 추론.
     *
     * @param requesterUserId 요청자 user id (FRIENDS 필터 / liked 매칭)
     * @param mode            필터 모드
     * @param cursor          이전 페이지 마지막 feed_post.id (없으면 null = 첫 페이지)
     * @param gymIdFilter     MY_GYM 모드에서만 사용 — 호출자가 미리 해석한 gymId
     * @param pageable        페이지 크기 정보. 정렬은 무시되고 항상 id DESC 강제
     * @return Slice. 본인이 팔로잉 중인 사용자가 없는 등 자연스러운 빈 결과는 빈 Slice
     */
    Slice<FeedRow> findFeed(
            long requesterUserId,
            FeedQueryMode mode,
            Long cursor,
            Long gymIdFilter,
            Pageable pageable);

    /**
     * (PR-F2) 주어진 feed_post id 들에 대해 post_media 를 seq 순서로 + media_assets join 으로
     * 한 번에 가져오는 batch fetch. 도메인 단계에서 postId 별로 그룹핑.
     *
     * @param feedPostIds 대상 feed_post id 집합 (비어있으면 빈 리스트 반환)
     * @return seq 오름차순으로 정렬된 미디어 행. 동일 post 의 미디어가 연속으로 나옴.
     */
    List<FeedMediaRow> findFeedMediaForPosts(Collection<Long> feedPostIds);
}
