package io.crimp.core.repository.feed;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.entity.gym.QGym;
import io.crimp.core.entity.log.QClimbingSession;
import io.crimp.core.entity.log.QSessionAttempt;
import io.crimp.core.entity.social.QFollow;
import io.crimp.core.entity.user.QProfile;
import io.crimp.core.entity.user.QUser;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 피드 리포지토리 QueryDSL 구현.
 *
 * <p>standalone {@code @Repository} 빈 형태로, 단일 엔티티에 묶이지 않는 read-only projection 을
 * 노출한다. Spring Data JPA 명명 규칙({EntityRepo}Impl)을 따르지 않으므로 {@code @Repository}
 * 명시.
 *
 * <p>{@code @Profile("!test")} — 테스트 프로파일에서는 JPA autoconfig 가 비활성이라
 * {@link JPAQueryFactory} 빈이 없다. {@link io.crimp.core.config.QueryDslConfig} 와 동일 가드.
 */
@Repository
@Profile("!test")
public class FeedRepositoryImpl implements FeedRepositoryCustom {

    /** 인기 필터에서 노출할 결과 코드 (성공한 시도만). */
    private static final List<AttemptResult> POPULAR_RESULTS =
            List.of(AttemptResult.SEND, AttemptResult.FLASH, AttemptResult.ONSIGHT);

    private final JPAQueryFactory queryFactory;

    public FeedRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Slice<FeedRow> findFeed(
            long requesterUserId,
            FeedQueryMode mode,
            Long cursor,
            Long gymIdFilter,
            Pageable pageable) {

        QSessionAttempt a = QSessionAttempt.sessionAttempt;
        QClimbingSession s = QClimbingSession.climbingSession;
        QUser u = QUser.user;
        QProfile p = QProfile.profile;
        QGym g = QGym.gym;
        QFollow follow = QFollow.follow;

        int pageSize = pageable.getPageSize();

        BooleanBuilder where = new BooleanBuilder()
                // 세션 소프트삭제 / 유저 소프트삭제 제외
                .and(s.deletedAt.isNull())
                .and(u.deletedAt.isNull());

        if (cursor != null) where.and(a.id.lt(cursor));

        switch (mode) {
            case POPULAR -> where.and(a.result.in(POPULAR_RESULTS));
            case MY_GYM -> {
                // gymIdFilter null 이면 호출자가 미리 빈 결과로 short-circuit 했어야 함.
                // 방어적으로 매칭 불가능한 조건을 넣어 빈 결과를 보장한다.
                if (gymIdFilter == null) {
                    return new SliceImpl<>(List.of(), pageable, false);
                }
                where.and(a.gymId.eq(gymIdFilter));
            }
            case FRIENDS -> {
                // 요청자가 팔로잉 중인 followee_id 서브쿼리. 팔로잉 0명이면 자연스럽게 빈 IN 매칭.
                where.and(s.userId.in(
                        JPAExpressions.select(follow.id.followeeId)
                                .from(follow)
                                .where(follow.id.followerId.eq(requesterUserId))));
            }
        }

        List<FeedRow> rows = queryFactory
                .select(Projections.constructor(
                        FeedRow.class,
                        a.id,
                        a.extId,
                        u.id,
                        u.extId,
                        p.nickname,
                        g.name,
                        a.result,
                        a.gradeValue,
                        a.gradeNumeric,
                        a.tagsJson,
                        a.note,
                        a.loggedAt))
                .from(a)
                .join(s).on(a.sessionId.eq(s.id))
                .join(u).on(s.userId.eq(u.id))
                .leftJoin(p).on(p.userId.eq(u.id))
                .leftJoin(g).on(a.gymId.eq(g.id))
                .where(where)
                .orderBy(a.id.desc())
                .limit(pageSize + 1L)
                .fetch();

        boolean hasNext = rows.size() > pageSize;
        List<FeedRow> content = hasNext ? rows.subList(0, pageSize) : rows;
        return new SliceImpl<>(content, pageable, hasNext);
    }
}
