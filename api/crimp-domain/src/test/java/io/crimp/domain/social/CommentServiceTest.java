package io.crimp.domain.social;

import io.crimp.core.entity.enums.PostVisibility;
import io.crimp.core.entity.feed.Comment;
import io.crimp.core.entity.feed.FeedPost;
import io.crimp.core.repository.feed.CommentRepository;
import io.crimp.core.repository.feed.FeedPostRepository;
import io.crimp.core.repository.user.ProfileRepository;
import io.crimp.core.repository.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.lang.reflect.Field;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CommentServiceTest {

    private FeedPostRepository feedPostRepo;
    private CommentRepository commentRepo;
    private UserRepository userRepo;
    private ProfileRepository profileRepo;
    private CommentService service;

    @BeforeEach
    void setUp() {
        feedPostRepo = mock(FeedPostRepository.class);
        commentRepo = mock(CommentRepository.class);
        userRepo = mock(UserRepository.class);
        profileRepo = mock(ProfileRepository.class);
        // user/profile findById 는 Mockito 기본이 Optional.empty() 반환이라 별도 stub 불필요.
        service = new CommentService(feedPostRepo, commentRepo, userRepo, profileRepo);
    }

    // --- create ---

    @Test
    void create_persists_comment_and_increments_counter() {
        FeedPost post = activePost(1L, "01HFP01");
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));
        when(commentRepo.save(any(Comment.class))).thenAnswer(i -> {
            Comment c = i.getArgument(0);
            setField(c, "id", 100L);
            return c;
        });

        CommentView view = service.create(42L, "01HFP01", "좋은 등반!", null);

        assertThat(view.extId()).hasSize(26);
        assertThat(view.content()).isEqualTo("좋은 등반!");
        assertThat(view.parentExtId()).isNull();
        ArgumentCaptor<Comment> cap = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepo).save(cap.capture());
        Comment saved = cap.getValue();
        assertThat(saved.getPostId()).isEqualTo(1L);
        assertThat(saved.getUserId()).isEqualTo(42L);
        assertThat(saved.getParentId()).isNull();
        verify(feedPostRepo).incrementCommentCount(1L);
    }

    @Test
    void create_with_parent_resolves_parent_id() {
        FeedPost post = activePost(1L, "01HFP01");
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));
        Comment parent = comment(50L, "01HC50", 1L, 7L, "원댓글");
        when(commentRepo.findByExtId("01HC50")).thenReturn(Optional.of(parent));
        when(commentRepo.save(any(Comment.class))).thenAnswer(i -> i.getArgument(0));

        CommentView view = service.create(42L, "01HFP01", "대댓글", "01HC50");

        assertThat(view.parentExtId()).isEqualTo("01HC50");
        ArgumentCaptor<Comment> cap = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepo).save(cap.capture());
        assertThat(cap.getValue().getParentId()).isEqualTo(50L);
    }

    @Test
    void create_with_parent_from_other_post_throws() {
        FeedPost post = activePost(1L, "01HFP01");
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));
        // 부모 댓글이 다른 게시물 (postId=999) 소속
        Comment foreignParent = comment(50L, "01HC50", 999L, 7L, "다른 글 댓글");
        when(commentRepo.findByExtId("01HC50")).thenReturn(Optional.of(foreignParent));

        assertThatThrownBy(() -> service.create(42L, "01HFP01", "대댓글", "01HC50"))
                .isInstanceOf(SocialException.class)
                .satisfies(e -> assertThat(((SocialException) e).code()).isEqualTo("COMMENT_NOT_FOUND"));
    }

    @Test
    void create_blank_content_rejected() {
        FeedPost post = activePost(1L, "01HFP01");
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> service.create(42L, "01HFP01", "", null))
                .isInstanceOf(SocialException.class)
                .satisfies(e -> assertThat(((SocialException) e).code()).isEqualTo("COMMENT_INVALID"));

        assertThatThrownBy(() -> service.create(42L, "01HFP01", "   ", null))
                .isInstanceOf(SocialException.class)
                .satisfies(e -> assertThat(((SocialException) e).code()).isEqualTo("COMMENT_INVALID"));

        assertThatThrownBy(() -> service.create(42L, "01HFP01", null, null))
                .isInstanceOf(SocialException.class)
                .satisfies(e -> assertThat(((SocialException) e).code()).isEqualTo("COMMENT_INVALID"));

        verify(commentRepo, never()).save(any());
    }

    @Test
    void create_content_over_1000_rejected() {
        FeedPost post = activePost(1L, "01HFP01");
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));
        String tooLong = "x".repeat(1001);

        assertThatThrownBy(() -> service.create(42L, "01HFP01", tooLong, null))
                .isInstanceOf(SocialException.class)
                .satisfies(e -> assertThat(((SocialException) e).code()).isEqualTo("COMMENT_INVALID"));
        verify(commentRepo, never()).save(any());
    }

    @Test
    void create_content_exactly_1000_accepted() {
        FeedPost post = activePost(1L, "01HFP01");
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));
        when(commentRepo.save(any(Comment.class))).thenAnswer(i -> i.getArgument(0));
        String exact = "x".repeat(1000);

        service.create(42L, "01HFP01", exact, null);
        verify(commentRepo).save(any(Comment.class));
    }

    @Test
    void create_on_unknown_post_throws() {
        when(feedPostRepo.findByExtId("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(42L, "missing", "hi", null))
                .isInstanceOf(SocialException.class)
                .satisfies(e -> assertThat(((SocialException) e).code()).isEqualTo("POST_NOT_FOUND"));
    }

    @Test
    void create_on_deleted_post_throws() {
        FeedPost post = activePost(1L, "01HFP01");
        post.softDelete();
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> service.create(42L, "01HFP01", "hi", null))
                .isInstanceOf(SocialException.class)
                .satisfies(e -> assertThat(((SocialException) e).code()).isEqualTo("POST_NOT_FOUND"));
    }

    // --- delete ---

    @Test
    void delete_only_by_owner() {
        Comment c = comment(50L, "01HC50", 1L, 7L, "내 댓글");
        when(commentRepo.findByExtId("01HC50")).thenReturn(Optional.of(c));

        // 다른 사용자(99) 가 본인 아닌 댓글 삭제 시도
        assertThatThrownBy(() -> service.delete(99L, "01HC50"))
                .isInstanceOf(SocialException.class)
                .satisfies(e -> assertThat(((SocialException) e).code()).isEqualTo("COMMENT_FORBIDDEN"));
        verify(feedPostRepo, never()).decrementCommentCount(anyLong());
    }

    @Test
    void delete_owner_soft_deletes_and_decrements_counter() {
        Comment c = comment(50L, "01HC50", 1L, 7L, "내 댓글");
        when(commentRepo.findByExtId("01HC50")).thenReturn(Optional.of(c));

        service.delete(7L, "01HC50");

        assertThat(c.isDeleted()).isTrue();
        verify(feedPostRepo).decrementCommentCount(1L);
    }

    @Test
    void delete_idempotent_when_already_deleted_no_counter_change() {
        Comment c = comment(50L, "01HC50", 1L, 7L, "내 댓글");
        c.softDelete(); // 이미 삭제 상태
        when(commentRepo.findByExtId("01HC50")).thenReturn(Optional.of(c));

        service.delete(7L, "01HC50");

        verify(feedPostRepo, never()).decrementCommentCount(anyLong());
    }

    @Test
    void delete_unknown_comment_throws() {
        when(commentRepo.findByExtId("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(7L, "missing"))
                .isInstanceOf(SocialException.class)
                .satisfies(e -> assertThat(((SocialException) e).code()).isEqualTo("COMMENT_NOT_FOUND"));
    }

    // --- helpers ---

    private static FeedPost activePost(long id, String extId) {
        FeedPost post = FeedPost.create(extId, 1L, "n", null, null, PostVisibility.PUBLIC);
        setField(post, "id", id);
        return post;
    }

    private static Comment comment(long id, String extId, long postId, long userId, String content) {
        Comment c = Comment.create(extId, postId, userId, null, content);
        setField(c, "id", id);
        return c;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Class<?> c = target.getClass();
            while (c != null) {
                try {
                    Field f = c.getDeclaredField(name);
                    f.setAccessible(true);
                    f.set(target, value);
                    return;
                } catch (NoSuchFieldException e) {
                    c = c.getSuperclass();
                }
            }
            throw new IllegalStateException("no field: " + name);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
