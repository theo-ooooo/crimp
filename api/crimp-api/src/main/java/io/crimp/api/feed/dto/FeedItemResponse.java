package io.crimp.api.feed.dto;

import io.crimp.domain.feed.FeedItemView;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 피드 한 아이템의 와이어 응답 DTO.
 *
 * <p>{@link FeedItemView} 와 거의 동일하지만 envelope 직렬화 시 enum 을 String 으로 노출하기
 * 위해 별도 record 를 둔다(Jackson 기본 enum 직렬화 = name()).
 *
 * <p>v2 변경: {@code extId} 가 FeedPost.extId 로 의미 전환 (이전엔 SessionAttempt.extId).
 * {@code likes}/{@code comments} 는 실제 카운터, {@code liked} 플래그가 추가되었다.
 *
 * @param result AttemptResult enum 의 String 표현 ("SEND", "FLASH", ...).
 */
public record FeedItemResponse(
        String extId,
        String userExtId,
        String userNickname,
        int avatarColorHue,
        String gymName,
        String result,
        String gradeValue,
        BigDecimal gradeNumeric,
        String holdColor,
        String note,
        long likes,
        long comments,
        boolean liked,
        Instant loggedAt
) {
    public static FeedItemResponse of(FeedItemView v) {
        return new FeedItemResponse(
                v.extId(),
                v.userExtId(),
                v.userNickname(),
                v.avatarColorHue(),
                v.gymName(),
                v.result() == null ? null : v.result().name(),
                v.gradeValue(),
                v.gradeNumeric(),
                v.holdColor(),
                v.note(),
                v.likes(),
                v.comments(),
                v.liked(),
                v.loggedAt());
    }
}
