package io.crimp.domain.log;

import io.crimp.core.entity.enums.AttemptResult;

import java.math.BigDecimal;

public record UpdateAttemptCommand(
        Long routeId,
        Long gymId,
        String gradeValue,
        BigDecimal gradeNumeric,
        AttemptResult result,
        Integer attempts,
        Long mediaId,
        String note,
        String tagsJson,
        /** 홀드 색 (PR #93, F5 PR-4). null 이면 변경 없음. */
        String holdColor
) {}
