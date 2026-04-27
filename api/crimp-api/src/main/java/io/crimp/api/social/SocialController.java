package io.crimp.api.social;

import io.crimp.api.security.CrimpPrincipal;
import io.crimp.api.social.dto.CommentListResponse;
import io.crimp.api.social.dto.CommentResponse;
import io.crimp.api.social.dto.CreateCommentRequest;
import io.crimp.api.social.dto.LikeToggleResponse;
import io.crimp.common.response.ApiResponse;
import io.crimp.common.response.ErrorBody;
import io.crimp.domain.social.CommentPage;
import io.crimp.domain.social.CommentService;
import io.crimp.domain.social.CommentView;
import io.crimp.domain.social.LikeService;
import io.crimp.domain.social.LikeToggleResult;
import io.crimp.domain.social.SocialException;
import jakarta.validation.Valid;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 좋아요·댓글 API.
 *
 * <p>경로:
 * <ul>
 *   <li>{@code POST   /api/v1/feed-posts/{extId}/like} — 좋아요 추가</li>
 *   <li>{@code DELETE /api/v1/feed-posts/{extId}/like} — 좋아요 취소</li>
 *   <li>{@code GET    /api/v1/feed-posts/{extId}/comments} — 댓글 목록</li>
 *   <li>{@code POST   /api/v1/feed-posts/{extId}/comments} — 댓글 작성</li>
 *   <li>{@code DELETE /api/v1/comments/{extId}} — 댓글 삭제 (본인만)</li>
 * </ul>
 *
 * <p>인증: {@link CrimpPrincipal} 필수.
 */
@RestController
@RequestMapping("/api/v1")
@Profile("!test")
public class SocialController {

    private final LikeService likeService;
    private final CommentService commentService;

    public SocialController(LikeService likeService, CommentService commentService) {
        this.likeService = likeService;
        this.commentService = commentService;
    }

    @PostMapping("/feed-posts/{extId}/like")
    public LikeToggleResponse like(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId) {
        LikeToggleResult result = likeService.like(principal.userId(), extId);
        return LikeToggleResponse.of(result);
    }

    @DeleteMapping("/feed-posts/{extId}/like")
    public LikeToggleResponse unlike(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId) {
        LikeToggleResult result = likeService.unlike(principal.userId(), extId);
        return LikeToggleResponse.of(result);
    }

    @GetMapping("/feed-posts/{extId}/comments")
    public CommentListResponse listComments(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId,
            @RequestParam(required = false) Long cursor,
            @RequestParam(required = false) Integer size) {
        CommentPage page = commentService.list(extId, cursor, size);
        return CommentListResponse.of(page);
    }

    @PostMapping("/feed-posts/{extId}/comments")
    public CommentResponse createComment(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId,
            @RequestBody @Valid CreateCommentRequest req) {
        CommentView view = commentService.create(
                principal.userId(), extId, req.content(), req.parentExtId());
        return CommentResponse.of(view);
    }

    @DeleteMapping("/comments/{extId}")
    public ResponseEntity<Void> deleteComment(
            @AuthenticationPrincipal CrimpPrincipal principal,
            @PathVariable String extId) {
        commentService.delete(principal.userId(), extId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(SocialException.class)
    public ResponseEntity<ApiResponse<Void>> handle(SocialException e) {
        int status = switch (e.code()) {
            case "POST_NOT_FOUND", "COMMENT_NOT_FOUND" -> 404;
            case "COMMENT_FORBIDDEN" -> 403;
            case "COMMENT_INVALID" -> 400;
            default -> 400;
        };
        return ResponseEntity.status(status)
                .body(ApiResponse.failure(ErrorBody.of(e.code(), e.getMessage())));
    }
}
