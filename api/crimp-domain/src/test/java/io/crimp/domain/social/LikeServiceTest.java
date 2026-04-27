package io.crimp.domain.social;

import io.crimp.core.entity.enums.PostVisibility;
import io.crimp.core.entity.feed.FeedPost;
import io.crimp.core.repository.feed.FeedPostRepository;
import io.crimp.core.repository.feed.PostLikeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LikeServiceTest {

    private FeedPostRepository feedPostRepo;
    private PostLikeRepository likeRepo;
    private LikeService service;

    @BeforeEach
    void setUp() {
        feedPostRepo = mock(FeedPostRepository.class);
        likeRepo = mock(PostLikeRepository.class);
        service = new LikeService(feedPostRepo, likeRepo);
    }

    @Test
    void like_inserts_row_and_increments_counter() {
        FeedPost post = activePost(1L, "01HFP01");
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));
        when(likeRepo.insertIgnore(42L, 1L)).thenReturn(1);
        when(feedPostRepo.findLikeCount(1L)).thenReturn(8);

        LikeToggleResult result = service.like(42L, "01HFP01");

        assertThat(result.liked()).isTrue();
        assertThat(result.likeCount()).isEqualTo(8L);
        verify(likeRepo).insertIgnore(42L, 1L);
        verify(feedPostRepo).incrementLikeCount(1L);
    }

    @Test
    void like_idempotent_when_already_liked_does_not_double_increment() {
        FeedPost post = activePost(1L, "01HFP01");
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));
        // 이미 존재 → INSERT IGNORE 가 0 row 반환
        when(likeRepo.insertIgnore(42L, 1L)).thenReturn(0);
        when(feedPostRepo.findLikeCount(1L)).thenReturn(5);

        LikeToggleResult result = service.like(42L, "01HFP01");

        assertThat(result.liked()).isTrue();
        assertThat(result.likeCount()).isEqualTo(5L);
        verify(feedPostRepo, never()).incrementLikeCount(anyLong());
    }

    @Test
    void unlike_deletes_row_and_decrements_counter() {
        FeedPost post = activePost(1L, "01HFP01");
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));
        when(likeRepo.deleteByUserAndPost(42L, 1L)).thenReturn(1);
        when(feedPostRepo.findLikeCount(1L)).thenReturn(4);

        LikeToggleResult result = service.unlike(42L, "01HFP01");

        assertThat(result.liked()).isFalse();
        assertThat(result.likeCount()).isEqualTo(4L);
        verify(likeRepo).deleteByUserAndPost(42L, 1L);
        verify(feedPostRepo).decrementLikeCount(1L);
    }

    @Test
    void unlike_already_unliked_no_op_counter_unchanged() {
        FeedPost post = activePost(1L, "01HFP01");
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));
        when(likeRepo.deleteByUserAndPost(42L, 1L)).thenReturn(0);
        when(feedPostRepo.findLikeCount(1L)).thenReturn(3);

        LikeToggleResult result = service.unlike(42L, "01HFP01");

        assertThat(result.liked()).isFalse();
        assertThat(result.likeCount()).isEqualTo(3L);
        verify(feedPostRepo, never()).decrementLikeCount(anyLong());
    }

    @Test
    void like_unknown_post_throws_post_not_found() {
        when(feedPostRepo.findByExtId("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.like(42L, "missing"))
                .isInstanceOf(SocialException.class)
                .satisfies(e -> assertThat(((SocialException) e).code()).isEqualTo("POST_NOT_FOUND"));
    }

    @Test
    void like_soft_deleted_post_throws_post_not_found() {
        FeedPost post = activePost(1L, "01HFP01");
        post.softDelete();
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> service.like(42L, "01HFP01"))
                .isInstanceOf(SocialException.class)
                .satisfies(e -> assertThat(((SocialException) e).code()).isEqualTo("POST_NOT_FOUND"));
    }

    @Test
    void like_count_floors_at_zero_when_db_returns_negative() {
        // unsigned INT 라 DB 에서 음수가 나올 수 없지만, mock 이 음수를 줘도 0 이상으로 클램프.
        FeedPost post = activePost(1L, "01HFP01");
        when(feedPostRepo.findByExtId("01HFP01")).thenReturn(Optional.of(post));
        when(likeRepo.deleteByUserAndPost(42L, 1L)).thenReturn(1);
        when(feedPostRepo.findLikeCount(1L)).thenReturn(-1);

        LikeToggleResult result = service.unlike(42L, "01HFP01");
        assertThat(result.likeCount()).isEqualTo(0L);
    }

    private static FeedPost activePost(long id, String extId) {
        FeedPost post = FeedPost.create(extId, 1L, "n", null, null, PostVisibility.PUBLIC);
        setField(post, "id", id);
        return post;
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
