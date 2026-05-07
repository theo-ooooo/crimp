package io.crimp.domain.feed;

import io.crimp.core.entity.enums.AttemptResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * 피드 한 카드의 도메인 뷰.
 *
 * <p>Controller 레이어에서 별도 DTO 로 한 번 더 매핑되며, 이 레코드 자체는 도메인 타입(enum,
 * BigDecimal, Instant) 을 그대로 노출한다. likes / comments 는 {@code feed_posts} 의 디노멀
 * 카운터 (like_count / comment_count) 를 직접 노출한다.
 *
 * @param extId         FeedPost.extId (ULID) — 좋아요/댓글 API 의 path 식별자
 * @param userExtId     User.extId (ULID)
 * @param userNickname  Profile.nickname
 * @param avatarColorHue 0..359 — userId 결정적 해시. {@link FeedService} 에서 계산
 * @param avatarUrl     프로필 이미지 CDN URL. 미설정 또는 CDN base URL 미설정이면 null
 * @param gymName       Gym.name (시도가 암장에 묶이지 않으면 null)
 * @param result        AttemptResult enum (자유 글 게시는 null)
 * @param gradeValue    grade 표기(예: "V5")
 * @param gradeNumeric  grade 숫자 (회귀/정렬용)
 * @param holdColor     SessionAttempt.hold_color (1급 컬럼) 우선 — null 이면 legacy tagsJson 의
 *                      hold 키에서 fallback 추출, 둘 다 없으면 null (PR #93, F5 PR-4)
 * @param note          시도 메모 또는 게시 본문
 * @param likes         좋아요 수 (FeedPost.like_count 디노멀 카운터)
 * @param comments      댓글 수 (FeedPost.comment_count 디노멀 카운터)
 * @param liked         요청자가 좋아요 눌렀는지 여부
 * @param loggedAt      시도 기록 시각 또는 게시 시각 (시도 비종속이면 createdAt fallback)
 * @param mediaUrls     post_media 의 seq 순서로 정렬된 미디어 (PR-F2). 없으면 빈 리스트 — null 미사용.
 */
public record FeedItemView(
        String extId,
        String userExtId,
        String userNickname,
        int avatarColorHue,
        String avatarUrl,
        String gymName,
        AttemptResult result,
        String gradeValue,
        BigDecimal gradeNumeric,
        String holdColor,
        String note,
        long likes,
        long comments,
        boolean liked,
        Instant loggedAt,
        List<FeedMediaItem> mediaUrls
) {}
