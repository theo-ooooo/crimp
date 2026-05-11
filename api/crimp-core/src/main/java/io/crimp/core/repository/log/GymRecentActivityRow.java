package io.crimp.core.repository.log;

import io.crimp.core.entity.enums.AttemptResult;

import java.time.Instant;

/**
 * 암장 최근 활동 쿼리의 평탄화 row.
 *
 * <p>userId 는 avatarColorHue 계산용 시드로만 사용한다.
 */
public record GymRecentActivityRow(
        long userId,
        String userExtId,
        String nickname,
        boolean userDeleted,
        String gradeValue,
        AttemptResult result,
        Instant loggedAt
) {}
