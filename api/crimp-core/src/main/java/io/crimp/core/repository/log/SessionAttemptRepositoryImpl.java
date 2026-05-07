package io.crimp.core.repository.log;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.entity.enums.UserStatus;
import io.crimp.core.entity.log.QClimbingSession;
import io.crimp.core.entity.log.QSessionAttempt;
import io.crimp.core.entity.user.QProfile;
import io.crimp.core.entity.user.QUser;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
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

    @Override
    public List<GymRecentActivityRow> findRecentActivityByGymId(long gymId, int limit) {
        if (limit <= 0) {
            return List.of();
        }
        QSessionAttempt a = QSessionAttempt.sessionAttempt;
        QClimbingSession s = QClimbingSession.climbingSession;
        QUser u = QUser.user;
        QProfile p = QProfile.profile;
        return queryFactory
                .select(Projections.constructor(
                        GymRecentActivityRow.class,
                        u.id,
                        u.extId,
                        p.nickname,
                        u.deletedAt.isNotNull().or(u.status.eq(UserStatus.DELETED)),
                        a.gradeValue,
                        a.result,
                        a.loggedAt))
                .from(a)
                .join(s).on(a.sessionId.eq(s.id))
                .join(u).on(s.userId.eq(u.id))
                .leftJoin(p).on(p.userId.eq(u.id))
                .where(s.deletedAt.isNull()
                        .and(a.gymId.eq(gymId).or(a.gymId.isNull().and(s.gymId.eq(gymId)))))
                .orderBy(a.loggedAt.desc(), a.id.desc())
                .limit(limit)
                .fetch();
    }

    @Override
    public List<GymActiveSessionRow> findActiveSessionsByGymId(long gymId) {
        QSessionAttempt a = QSessionAttempt.sessionAttempt;
        QClimbingSession s = QClimbingSession.climbingSession;
        return queryFactory
                .select(Projections.constructor(
                        GymActiveSessionRow.class,
                        s.id,
                        s.userId,
                        a.gradeValue,
                        a.gradeNumeric))
                .from(s)
                .leftJoin(a).on(a.sessionId.eq(s.id)
                        .and(a.gradeValue.isNotNull().or(a.gradeNumeric.isNotNull())))
                .where(s.deletedAt.isNull()
                        .and(s.endedAt.isNull())
                        .and(s.gymId.eq(gymId)))
                .orderBy(s.id.asc(), a.loggedAt.desc(), a.id.desc())
                .fetch();
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
