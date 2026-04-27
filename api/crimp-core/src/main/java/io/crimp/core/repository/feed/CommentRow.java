package io.crimp.core.repository.feed;

import java.time.Instant;

/**
 * 댓글 한 행의 평탄화 프로젝션.
 *
 * <p>Comment + User + Profile 의 표시용 필드만 모음. 부모 댓글 ext_id 는 self-join 으로 가져온다.
 *
 * @param commentId       Comment.id (커서 페이지네이션 키)
 * @param commentExtId    Comment.extId
 * @param userId          User.id (avatarColorHue 시드)
 * @param userExtId       User.extId
 * @param userNickname    Profile.nickname (LEFT JOIN — 프로필 미생성 시 null)
 * @param content         댓글 본문
 * @param createdAt       작성 시각
 * @param parentExtId     부모 댓글 ext_id (top-level 이면 null)
 */
public record CommentRow(
        long commentId,
        String commentExtId,
        long userId,
        String userExtId,
        String userNickname,
        String content,
        Instant createdAt,
        String parentExtId
) {}
