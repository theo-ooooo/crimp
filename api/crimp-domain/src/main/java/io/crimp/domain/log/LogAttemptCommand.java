package io.crimp.domain.log;

import io.crimp.core.entity.enums.AttemptResult;

import java.math.BigDecimal;
import java.time.Instant;

public record LogAttemptCommand(
        Long routeId,
        Long gymId,
        String gradeValue,
        BigDecimal gradeNumeric,
        AttemptResult result,
        Integer attempts,
        Long mediaId,
        String note,
        String tagsJson,
        /** 홀드 색 (PR #93, F5 PR-4) — 클라가 LogAttempt 시 함께 보냄. nullable. */
        String holdColor,
        Instant loggedAt
) {}
