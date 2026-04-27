package io.crimp.domain.social;

import io.crimp.common.id.UlidGenerator;
import io.crimp.core.entity.feed.Comment;
import io.crimp.core.entity.feed.FeedPost;
import io.crimp.core.entity.user.User;
import io.crimp.core.repository.feed.CommentRepository;
import io.crimp.core.repository.feed.CommentRow;
import io.crimp.core.repository.feed.FeedPostRepository;
import io.crimp.core.repository.user.ProfileRepository;
import io.crimp.core.repository.user.UserRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * 댓글 도메인 서비스.
 *
 * <p>create/delete 모두 {@code feed_posts.comment_count} 디노멀 카운터를 동시 갱신.
 * delete 는 soft-delete (deleted_at = NOW()) 이며, 이미 삭제된 댓글에 대한 재호출은 멱등 (no-op).
 */
@Service
@Profile("!test")
public class CommentService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;
    private static final int MAX_CONTENT_LENGTH = 1000;

    private final FeedPostRepository feedPostRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;

    public CommentService(FeedPostRepository feedPostRepository,
                          CommentRepository commentRepository,
                          UserRepository userRepository,
                          ProfileRepository profileRepository) {
        this.feedPostRepository = feedPostRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
    }

    @Transactional(readOnly = true)
    public CommentPage list(String postExtId, Long cursor, Integer size) {
        FeedPost post = fetchActivePost(postExtId);
        int pageSize = normalizeSize(size);

        Slice<CommentRow> slice = commentRepository.listByPost(
                post.getId(), cursor, PageRequest.of(0, pageSize));

        List<CommentView> items = slice.getContent().stream()
                .map(CommentService::toView)
                .toList();

        Long nextCursor = slice.hasNext() && !slice.getContent().isEmpty()
                ? slice.getContent().get(slice.getContent().size() - 1).commentId()
                : null;

        return new CommentPage(items, nextCursor, pageSize);
    }

    /**
     * 댓글 작성. content 가 blank 또는 1000 자 초과면 {@code COMMENT_INVALID}.
     * parent_id 는 ext_id 로 받아 같은 게시물의 댓글인지까지 확인 (cross-post 부모 차단).
     */
    @Transactional
    public CommentView create(long userId, String postExtId, String content, String parentExtId) {
        FeedPost post = fetchActivePost(postExtId);

        if (content == null || content.isBlank()) {
            throw new SocialException("COMMENT_INVALID", "content is required");
        }
        if (content.length() > MAX_CONTENT_LENGTH) {
            throw new SocialException("COMMENT_INVALID",
                    "content must be <= " + MAX_CONTENT_LENGTH + " chars");
        }

        Long parentId = null;
        String resolvedParentExtId = null;
        if (parentExtId != null && !parentExtId.isBlank()) {
            Comment parent = commentRepository.findByExtId(parentExtId)
                    .orElseThrow(() -> new SocialException("COMMENT_NOT_FOUND",
                            "Parent comment " + parentExtId + " not found"));
            if (parent.isDeleted() || !parent.getPostId().equals(post.getId())) {
                throw new SocialException("COMMENT_NOT_FOUND",
                        "Parent comment " + parentExtId + " not found");
            }
            parentId = parent.getId();
            resolvedParentExtId = parent.getExtId();
        }

        Comment comment = Comment.create(
                UlidGenerator.next(), post.getId(), userId, parentId, content);
        commentRepository.save(comment);
        // I4: flush 후 DB 의 CURRENT_TIMESTAMP 를 영속 컨텍스트로 끌어와 list 재조회와
        // createdAt 을 일치시킨다. (이전: Instant.now() 로 ms 단위 어긋남 → 클라이언트의
        // 시간 기준 정렬·매칭이 깨질 수 있었음.)
        commentRepository.flush();
        feedPostRepository.incrementCommentCount(post.getId());

        // 작성자 정보는 응답에 같이 내려준다 — 클라이언트가 작성 직후 list 재호출 없이 즉시
        // 카드 렌더링할 수 있도록.
        Optional<User> userOpt = userRepository.findById(userId);
        Optional<io.crimp.core.entity.user.Profile> profileOpt = profileRepository.findById(userId);
        return new CommentView(
                comment.getExtId(),
                userOpt.map(User::getExtId).orElse(null),
                profileOpt.map(io.crimp.core.entity.user.Profile::getNickname).orElse(null),
                avatarColorHue(userId),
                comment.getContent(),
                comment.getCreatedAt(),
                resolvedParentExtId);
    }

    /**
     * 댓글 soft-delete. 본인이 아니면 {@code COMMENT_FORBIDDEN}. 이미 삭제된 댓글에 대한
     * 재호출은 no-op (카운터 변동 없음).
     */
    @Transactional
    public void delete(long userId, String commentExtId) {
        Comment comment = commentRepository.findByExtId(commentExtId)
                .orElseThrow(() -> new SocialException("COMMENT_NOT_FOUND",
                        "Comment " + commentExtId + " not found"));
        if (comment.getUserId() == null || comment.getUserId() != userId) {
            throw new SocialException("COMMENT_FORBIDDEN",
                    "Cannot delete comment of another user");
        }
        if (comment.isDeleted()) {
            return; // 멱등
        }
        comment.softDelete();
        feedPostRepository.decrementCommentCount(comment.getPostId());
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

    private static int normalizeSize(Integer size) {
        if (size == null || size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    /** 피드 서비스와 동일 공식 — 일관된 아바타 hue. */
    static int avatarColorHue(long userId) {
        long hue = ((userId * 70L) + 180L) % 360L;
        if (hue < 0) hue += 360L;
        return (int) hue;
    }

    private static CommentView toView(CommentRow row) {
        return new CommentView(
                row.commentExtId(),
                row.userExtId(),
                row.userNickname(),
                avatarColorHue(row.userId()),
                row.content(),
                row.createdAt(),
                row.parentExtId());
    }
}
