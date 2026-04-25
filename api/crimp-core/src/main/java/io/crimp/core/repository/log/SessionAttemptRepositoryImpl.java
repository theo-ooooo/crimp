package io.crimp.core.repository.log;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.entity.log.QClimbingSession;
import io.crimp.core.entity.log.QSessionAttempt;

import java.time.Instant;
import java.util.Collection;
import java.util.Optional;

public class SessionAttemptRepositoryImpl implements SessionAttemptRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public SessionAttemptRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public long countSendsByUserId(long userId, Collection<AttemptResult> results) {
        QSessionAttempt a = QSessionAttempt.sessionAttempt;
        QClimbingSession s = QClimbingSession.climbingSession;
        Long cnt = queryFactory
                .select(a.count())
                .from(a)
                .join(s).on(a.sessionId.eq(s.id))
                .where(ownedNotDeletedAndResultIn(a, s, userId, results))
                .fetchOne();
        return cnt == null ? 0L : cnt;
    }

    @Override
    public long countSendsByUserIdAndLoggedAtBetween(
            long userId, Collection<AttemptResult> results, Instant from, Instant to) {
        QSessionAttempt a = QSessionAttempt.sessionAttempt;
        QClimbingSession s = QClimbingSession.climbingSession;
        Long cnt = queryFactory
                .select(a.count())
                .from(a)
                .join(s).on(a.sessionId.eq(s.id))
                .where(ownedNotDeletedAndResultIn(a, s, userId, results)
                        .and(a.loggedAt.between(from, to)))
                .fetchOne();
        return cnt == null ? 0L : cnt;
    }

    @Override
    public Optional<String> findTopGradeValueByUserId(
            long userId, Collection<AttemptResult> results) {
        QSessionAttempt a = QSessionAttempt.sessionAttempt;
        QClimbingSession s = QClimbingSession.climbingSession;
        String value = queryFactory
                .select(a.gradeValue)
                .from(a)
                .join(s).on(a.sessionId.eq(s.id))
                .where(ownedNotDeletedAndResultIn(a, s, userId, results)
                        .and(a.gradeNumeric.isNotNull())
                        .and(a.gradeValue.isNotNull()))
                // 동률 시 최근 시도 우선 (보조 정렬)
                .orderBy(a.gradeNumeric.desc(), a.loggedAt.desc())
                .limit(1)
                .fetchOne();
        return Optional.ofNullable(value);
    }

    private static BooleanBuilder ownedNotDeletedAndResultIn(
            QSessionAttempt a, QClimbingSession s,
            long userId, Collection<AttemptResult> results) {
        return new BooleanBuilder()
                .and(s.userId.eq(userId))
                .and(s.deletedAt.isNull())
                .and(a.result.in(results));
    }
}
