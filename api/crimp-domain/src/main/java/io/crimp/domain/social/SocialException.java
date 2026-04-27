package io.crimp.domain.social;

/**
 * Like / Comment 도메인 예외.
 *
 * <p>code 컨벤션:
 * <ul>
 *   <li>{@code POST_NOT_FOUND} — 게시물 없거나 soft-deleted</li>
 *   <li>{@code COMMENT_NOT_FOUND} — 댓글 없거나 soft-deleted</li>
 *   <li>{@code COMMENT_FORBIDDEN} — 댓글 삭제 권한 없음 (본인 아님)</li>
 *   <li>{@code COMMENT_INVALID} — content blank 또는 길이 위반</li>
 * </ul>
 */
public class SocialException extends RuntimeException {

    private final String code;

    public SocialException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
