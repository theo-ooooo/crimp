package io.crimp.core.repository.feed;

import io.crimp.core.entity.enums.AttemptResult;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 피드 한 행의 평탄화 프로젝션. FeedPost + SessionAttempt + User + Profile + Gym 의 필요
 * 필드만 모아둔 read-only DTO. Controller/도메인 뷰로 가공하기 전 단계.
 *
 * <p>커서 페이지네이션 키는 {@link #feedPostId} — feed_posts.id DESC.
 *
 * @param feedPostId     FeedPost.id — 커서 페이지네이션 키 / liked LEFT JOIN 매칭 키
 * @param feedPostExtId  FeedPost.extId — 응답 노출 식별자
 * @param attemptId      SessionAttempt.id — 1:1 링크. attempt 비종속 게시는 null
 * @param attemptExtId   SessionAttempt.extId — 추가 컨텍스트 (현재 응답에서는 사용 안 하지만
 *                       후속 PR 에서 시도 상세 화면 진입에 활용 가능)
 * @param userId         User.id — avatarColorHue 결정적 계산 시드.
 *                       INNER JOIN + NOT NULL PK 보장이라 primitive {@code long} 으로 받아
 *                       null 케이스 자체를 컴파일 타임에 제거.
 * @param userExtId      User.extId
 * @param nickname       Profile.nickname
 * @param gymName        Gym.name (LEFT JOIN — 자연 암장 등은 null)
 * @param result         AttemptResult (attempt 비종속 게시는 null)
 * @param gradeValue     SessionAttempt.gradeValue
 * @param gradeNumeric   SessionAttempt.gradeNumeric
 * @param tagsJson       SessionAttempt.tagsJson (legacy — 구버전 클라가 hold 색을 JSON 으로 인코딩)
 * @param holdColor      SessionAttempt.hold_color (PR #93, F5 PR-4) — 1급 컬럼. 신버전 클라 우선
 * @param note           SessionAttempt.note 또는 FeedPost.content (도메인에서 합성)
 * @param loggedAt       SessionAttempt.loggedAt 또는 FeedPost.createdAt (fallback)
 * @param likeCount      FeedPost.like_count (디노멀 카운터)
 * @param commentCount   FeedPost.comment_count (디노멀 카운터)
 * @param liked          요청자 likes 테이블 LEFT JOIN 결과 — true=좋아요 누름
 */
public record FeedRow(
        long feedPostId,
        String feedPostExtId,
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
        String holdColor,
        String note,
        Instant loggedAt,
        long likeCount,
        long commentCount,
        boolean liked
) {}
