package io.crimp.domain.gym;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 루트 목록 응답용 뷰 레코드. 엔티티 노출을 피하기 위해 도메인 계층에 위치한다.
 *
 * gradeScale 은 코어 enum 대신 String 으로 전달해 API 계층이 코어 enum 에 직접 의존하지 않도록 한다.
 * (API 계약상 문자열 값 "V"/"FONT"/"YDS" 등을 그대로 노출.)
 */
public record RouteView(
        String extId,
        String name,
        String color,
        String gradeScale,
        String gradeValue,
        BigDecimal gradeNumeric,
        String setter,
        LocalDate setAt
) {}
