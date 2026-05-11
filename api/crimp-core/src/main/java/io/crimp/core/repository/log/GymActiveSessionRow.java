package io.crimp.core.repository.log;

import java.math.BigDecimal;

/**
 * 암장 active-sessions 집계용 평탄화 row.
 *
 * <p>session 1건당 1 row 를 기대하며, 서비스 레이어에서 sessionId 기준으로 첫 row 를
 * latest graded attempt 로 해석한다.
 */
public record GymActiveSessionRow(
        long sessionId,
        long userId,
        String gradeValue,
        BigDecimal gradeNumeric
) {}
