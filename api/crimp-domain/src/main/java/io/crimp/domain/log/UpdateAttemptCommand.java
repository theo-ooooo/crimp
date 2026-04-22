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
        String tagsJson
) {}
