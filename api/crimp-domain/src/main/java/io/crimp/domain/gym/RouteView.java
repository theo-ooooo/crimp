package io.crimp.domain.gym;

import io.crimp.core.entity.enums.GradeScale;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 루트 목록 응답용 뷰 레코드. 엔티티 노출을 피하기 위해 도메인 계층에 위치한다.
 */
public record RouteView(
        String extId,
        String name,
        String color,
        GradeScale gradeScale,
        String gradeValue,
        BigDecimal gradeNumeric,
        String setter,
        LocalDate setAt
) {}
