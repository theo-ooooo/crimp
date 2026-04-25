package io.crimp.core.repository.log;

import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.entity.log.SessionAttempt;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SessionAttemptRepository extends JpaRepository<SessionAttempt, Long> {
    Optional<SessionAttempt> findByExtId(String extId);
    List<SessionAttempt> findBySessionIdOrderByLoggedAt(Long sessionId);

    /**
     * 사용자 본인 소유 + 미삭제 세션의 시도 중 result IN (:results) 인 건의 누적 개수.
     * SessionAttempt 엔티티는 직접 ClimbingSession 과 ManyToOne 매핑이 없어
     * sessionId 컬럼 기준으로 ClimbingSession 을 명시 join 한다.
     */
    @Query("""
            SELECT COUNT(a) FROM SessionAttempt a, ClimbingSession s
            WHERE a.sessionId = s.id
              AND s.userId = :userId
              AND s.deletedAt IS NULL
              AND a.result IN (:results)
            """)
    long countSendsByUserId(
            @Param("userId") long userId,
            @Param("results") Collection<AttemptResult> results);

    /**
     * 위 조건 + loggedAt 이 [from, to] 구간 안에 들어오는 시도 개수 (주간 집계).
     */
    @Query("""
            SELECT COUNT(a) FROM SessionAttempt a, ClimbingSession s
            WHERE a.sessionId = s.id
              AND s.userId = :userId
              AND s.deletedAt IS NULL
              AND a.result IN (:results)
              AND a.loggedAt BETWEEN :from AND :to
            """)
    long countSendsByUserIdAndLoggedAtBetween(
            @Param("userId") long userId,
            @Param("results") Collection<AttemptResult> results,
            @Param("from") Instant from,
            @Param("to") Instant to);

    /**
     * 본인 소유 + 미삭제 세션의 send/flash/onsight 시도 중
     * gradeNumeric 이 가장 큰 시도의 gradeValue 문자열을 반환.
     * Pageable.ofSize(1) 로 호출해 단일 행만 가져온다.
     */
    @Query("""
            SELECT a.gradeValue FROM SessionAttempt a, ClimbingSession s
            WHERE a.sessionId = s.id
              AND s.userId = :userId
              AND s.deletedAt IS NULL
              AND a.result IN (:results)
              AND a.gradeNumeric IS NOT NULL
              AND a.gradeValue IS NOT NULL
            ORDER BY a.gradeNumeric DESC
            """)
    List<String> findTopGradeValueByUserId(
            @Param("userId") long userId,
            @Param("results") Collection<AttemptResult> results,
            Pageable pageable);
}
