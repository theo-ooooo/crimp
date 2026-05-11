package io.crimp.core.repository.log;

import io.crimp.core.entity.enums.AttemptResult;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * QueryDSL 기반 SessionAttempt 커스텀 리포 — 집계·통계용.
 *
 * 단순 단건 조회·정렬은 {@link SessionAttemptRepository} 의 Spring Data 메서드로,
 * 다중 조건 조합·동적 where 가 필요한 경우만 여기서 처리한다.
 */
public interface SessionAttemptRepositoryCustom {

    /** 본인 소유 + 미삭제 세션의 시도 중 result 조건을 만족하는 건수. */
    long countSendsByUserId(long userId, Collection<AttemptResult> results);

    /** 위 조건에 loggedAt [from, to] 범위 추가. */
    long countSendsByUserIdAndLoggedAtBetween(
            long userId, Collection<AttemptResult> results, Instant from, Instant to);

    /**
     * 최고 그레이드 시도의 gradeValue.
     * 정렬: gradeNumeric DESC, loggedAt DESC (동률 시 최근 시도 우선).
     */
    Optional<String> findTopGradeValueByUserId(long userId, Collection<AttemptResult> results);

    /** 특정 gym 의 최근 활동 N건. 최신 loggedAt DESC, 동률 시 id DESC. */
    List<GymRecentActivityRow> findRecentActivityByGymId(long gymId, int limit);

    /**
     * 특정 gym 의 active session 들과 최신 그레이드 attempt.
     *
     * <p>세션 1건당 1개 이상의 attempt row 가 있을 수 있으므로, 서비스는 sessionId 기준으로
     * 첫 row 를 latest graded attempt 로 해석한다.
     */
    List<GymActiveSessionRow> findActiveSessionsByGymId(long gymId);
}
