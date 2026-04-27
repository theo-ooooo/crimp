package io.crimp.domain.social;

import io.crimp.core.entity.feed.FeedPost;
import io.crimp.core.repository.feed.FeedPostRepository;
import io.crimp.core.repository.feed.PostLikeRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 좋아요 도메인 서비스.
 *
 * <p>like / unlike 모두 멱등이며, 카운터 갱신은 직접 UPDATE 로 race-safe 하게 처리한다 — 동일
 * 사용자가 더블클릭으로 두 번 like 호출해도 카운터는 1만 오른다 (composite PK 충돌 → 0 row 영향
 * → 카운터 미증감).
 */
@Service
@Profile("!test")
public class LikeService {

    private final FeedPostRepository feedPostRepository;
    private final PostLikeRepository likeRepository;

    public LikeService(FeedPostRepository feedPostRepository, PostLikeRepository likeRepository) {
        this.feedPostRepository = feedPostRepository;
        this.likeRepository = likeRepository;
    }

    /**
     * 좋아요 추가 (멱등).
     *
     * @return 갱신된 카운터 — 이미 좋아요 상태면 기존 카운터 그대로
     */
    @Transactional
    public LikeToggleResult like(long userId, String postExtId) {
        FeedPost post = fetchActivePost(postExtId);
        int inserted = likeRepository.insertIgnore(userId, post.getId());
        if (inserted > 0) {
            feedPostRepository.incrementLikeCount(post.getId());
        }
        // 카운터를 다시 조회 — INSERT IGNORE 로 새로 들어왔든 아니든 현재값 확정.
        long currentCount = currentLikeCount(post.getId());
        return new LikeToggleResult(true, currentCount);
    }

    /**
     * 좋아요 해제 (멱등). 누른 적 없으면 카운터 변동 없음.
     */
    @Transactional
    public LikeToggleResult unlike(long userId, String postExtId) {
        FeedPost post = fetchActivePost(postExtId);
        int deleted = likeRepository.deleteByUserAndPost(userId, post.getId());
        if (deleted > 0) {
            feedPostRepository.decrementLikeCount(post.getId());
        }
        long currentCount = currentLikeCount(post.getId());
        return new LikeToggleResult(false, currentCount);
    }

    private FeedPost fetchActivePost(String postExtId) {
        FeedPost post = feedPostRepository.findByExtId(postExtId)
                .orElseThrow(() -> new SocialException("POST_NOT_FOUND",
                        "Feed post " + postExtId + " not found"));
        if (post.isDeleted()) {
            throw new SocialException("POST_NOT_FOUND",
                    "Feed post " + postExtId + " not found");
        }
        return post;
    }

    /**
     * 카운터 재조회. 직접 UPDATE 후 영속 컨텍스트의 캐시된 엔티티는 stale 이므로 JPQL 단일
     * 컬럼 프로젝션으로 DB 의 실제 값을 다시 가져온다. 카운터는 unsigned INT 라 음수일 수
     * 없지만 방어적으로 0 floor.
     */
    private long currentLikeCount(long postId) {
        Integer raw = feedPostRepository.findLikeCount(postId);
        return raw == null ? 0L : Math.max(raw.longValue(), 0L);
    }
}
