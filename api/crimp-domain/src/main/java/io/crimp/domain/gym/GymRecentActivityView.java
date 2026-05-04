package io.crimp.domain.gym;

import io.crimp.core.entity.enums.AttemptResult;

import java.time.Instant;

/**
 * 암장 최근 활동 한 건의 도메인 뷰.
 *
 * <p>controller 에서는 그대로 최근 활동 카드 응답으로 매핑된다.
 */
public record GymRecentActivityView(
        String userExtId,
        String nickname,
        int avatarColorHue,
        String gradeValue,
        AttemptResult result,
        Instant loggedAt
) {}
