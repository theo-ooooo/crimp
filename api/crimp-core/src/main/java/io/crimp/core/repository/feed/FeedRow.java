package io.crimp.core.repository.feed;

import io.crimp.core.entity.enums.AttemptResult;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 피드 한 행의 평탄화 프로젝션. SessionAttempt + ClimbingSession + User + Profile + Gym 의 필요
 * 필드만 모아둔 read-only DTO. Controller/도메인 뷰로 가공하기 전 단계.
 *
 * @param attemptId      SessionAttempt.id — 커서 페이지네이션 키
 * @param attemptExtId   SessionAttempt.extId
 * @param userId         User.id — avatarColorHue 결정적 계산 시드.
 *                       INNER JOIN + NOT NULL PK 보장이라 primitive {@code long} 으로 받아
 *                       null 케이스 자체를 컴파일 타임에 제거.
 * @param userExtId      User.extId
 * @param nickname       Profile.nickname
 * @param gymName        Gym.name (LEFT JOIN — 자연 암장 등은 null)
 * @param result         AttemptResult
 * @param gradeValue     SessionAttempt.gradeValue
 * @param gradeNumeric   SessionAttempt.gradeNumeric
 * @param tagsJson       SessionAttempt.tagsJson (hold 색상 등 추출 원천)
 * @param note           SessionAttempt.note
 * @param loggedAt       SessionAttempt.loggedAt
 */
public record FeedRow(
        Long attemptId,
        String attemptExtId,
        long userId,
        String userExtId,
        String nickname,
        String gymName,
        AttemptResult result,
        String gradeValue,
        BigDecimal gradeNumeric,
        String tagsJson,
        String note,
        Instant loggedAt
) {}
