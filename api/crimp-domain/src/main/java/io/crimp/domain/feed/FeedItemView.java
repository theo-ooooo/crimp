package io.crimp.domain.feed;

import io.crimp.core.entity.enums.AttemptResult;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 피드 한 카드의 도메인 뷰.
 *
 * <p>Controller 레이어에서 별도 DTO 로 한 번 더 매핑되며, 이 레코드 자체는 도메인 타입(enum,
 * BigDecimal, Instant) 을 그대로 노출한다. likes / comments 는 좋아요·댓글 도메인 도입 전까지
 * placeholder {@code 0L}.
 *
 * @param extId         SessionAttempt.extId (ULID)
 * @param userExtId     User.extId (ULID)
 * @param userNickname  Profile.nickname
 * @param avatarColorHue 0..359 — userId 결정적 해시. {@link FeedService} 에서 계산
 * @param gymName       Gym.name (시도가 암장에 묶이지 않으면 null)
 * @param result        AttemptResult enum
 * @param gradeValue    grade 표기(예: "V5")
 * @param gradeNumeric  grade 숫자 (회귀/정렬용)
 * @param holdColor     tagsJson 의 hold 키에서 파싱된 색상 (없으면 null)
 * @param note          시도 메모
 * @param likes         좋아요 수 — Phase 1.5 도입 전엔 항상 0
 * @param comments      댓글 수 — Phase 1.5 도입 전엔 항상 0
 * @param loggedAt      시도 기록 시각
 */
public record FeedItemView(
        String extId,
        String userExtId,
        String userNickname,
        int avatarColorHue,
        String gymName,
        AttemptResult result,
        String gradeValue,
        BigDecimal gradeNumeric,
        String holdColor,
        String note,
        long likes,
        long comments,
        Instant loggedAt
) {}
