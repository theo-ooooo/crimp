package io.crimp.core.repository.gym;

import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.entity.log.QClimbingSession;
import io.crimp.core.entity.log.QSessionAttempt;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

/**
 * QueryDSL 기반 gym_stats 집계 리포.
 */
public class GymStatsRepositoryImpl implements GymStatsRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public GymStatsRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public List<GymStatsCountRow> countSendsByGymId(Collection<AttemptResult> results) {
        if (results == null || results.isEmpty()) {
            return List.of();
        }
        QSessionAttempt a = QSessionAttempt.sessionAttempt;
        QClimbingSession s = QClimbingSession.climbingSession;
        return queryFactory
                .select(Projections.constructor(
                        GymStatsCountRow.class,
                        s.gymId,
                        a.id.count()))
                .from(a)
                .join(s).on(a.sessionId.eq(s.id))
                .where(s.deletedAt.isNull()
                        .and(s.gymId.isNotNull())
                        .and(a.result.in(results)))
                .groupBy(s.gymId)
                .fetch();
    }

    @Override
    public List<GymStatsCountRow> countMonthlyUsersByGymId(Instant fromInclusive) {
        QClimbingSession s = QClimbingSession.climbingSession;
        return queryFactory
                .select(Projections.constructor(
                        GymStatsCountRow.class,
                        s.gymId,
                        s.userId.countDistinct()))
                .from(s)
                .where(s.deletedAt.isNull()
                        .and(s.gymId.isNotNull())
                        .and(s.startedAt.goe(fromInclusive)))
                .groupBy(s.gymId)
                .fetch();
    }
}
