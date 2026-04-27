package io.crimp.domain.social;

import java.time.Instant;

/**
 * 댓글 한 건의 도메인 뷰.
 *
 * @param extId          Comment.extId (ULID)
 * @param userExtId      작성자 User.extId
 * @param userNickname   작성자 닉네임 (nullable — 프로필 미생성 시)
 * @param avatarColorHue 작성자 아바타 hue (피드와 동일 공식)
 * @param content        본문
 * @param createdAt      작성 시각
 * @param parentExtId    부모 댓글 extId — top-level 이면 null
 */
public record CommentView(
        String extId,
        String userExtId,
        String userNickname,
        int avatarColorHue,
        String content,
        Instant createdAt,
        String parentExtId
) {}
