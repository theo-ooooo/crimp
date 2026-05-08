package io.crimp.core.repository.crew;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.crew.QCrew;
import io.crimp.core.entity.crew.QCrewJoinRequest;
import io.crimp.core.entity.enums.CrewJoinRequestStatus;
import io.crimp.core.entity.user.QProfile;
import io.crimp.core.entity.user.QUser;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.util.List;
import java.util.Optional;

public class CrewJoinRequestRepositoryImpl implements CrewJoinRequestRepositoryCustom {

    private final JPAQueryFactory jpaQueryFactory;

    public CrewJoinRequestRepositoryImpl(JPAQueryFactory jpaQueryFactory) {
        this.jpaQueryFactory = jpaQueryFactory;
    }

    @Override
    public Slice<CrewJoinRequestRow> searchByCrew(Long crewId, CrewJoinRequestStatus status, Long cursorId,
                                                  Pageable pageable) {
        QCrewJoinRequest request = QCrewJoinRequest.crewJoinRequest;
        int pageSize = pageable.getPageSize();
        List<CrewJoinRequestRow> rows = baseQuery()
                .where(where(crewId, status, cursorId))
                .orderBy(request.id.desc())
                .limit(pageSize + 1L)
                .fetch();

        boolean hasNext = rows.size() > pageSize;
        List<CrewJoinRequestRow> content = hasNext ? rows.subList(0, pageSize) : rows;
        return new SliceImpl<>(content, pageable, hasNext);
    }

    @Override
    public Optional<CrewJoinRequestRow> findRowByExtId(String extId) {
        QCrewJoinRequest request = QCrewJoinRequest.crewJoinRequest;
        CrewJoinRequestRow row = baseQuery()
                .where(request.extId.eq(extId))
                .fetchOne();
        return Optional.ofNullable(row);
    }

    private JPAQuery<CrewJoinRequestRow> baseQuery() {
        QCrewJoinRequest request = QCrewJoinRequest.crewJoinRequest;
        QCrew crew = QCrew.crew;
        QUser user = new QUser("crewJoinRequestUser");
        QProfile profile = new QProfile("crewJoinRequestProfile");
        QUser decider = new QUser("crewJoinRequestDecider");

        return jpaQueryFactory
                .select(Projections.constructor(CrewJoinRequestRow.class,
                        request.id,
                        request.extId,
                        request.crewId,
                        crew.extId,
                        request.userId,
                        user.extId,
                        profile.nickname,
                        request.message,
                        request.status,
                        decider.extId,
                        request.decidedAt,
                        request.createdAt
                ))
                .from(request)
                .join(crew).on(crew.id.eq(request.crewId))
                .join(user).on(user.id.eq(request.userId))
                .leftJoin(profile).on(profile.userId.eq(request.userId))
                .leftJoin(decider).on(decider.id.eq(request.decidedBy));
    }

    private static BooleanBuilder where(Long crewId, CrewJoinRequestStatus status, Long cursorId) {
        QCrewJoinRequest request = QCrewJoinRequest.crewJoinRequest;
        BooleanBuilder where = new BooleanBuilder().and(request.crewId.eq(crewId));
        if (status != null) where.and(request.status.eq(status));
        if (cursorId != null) where.and(request.id.lt(cursorId));
        return where;
    }
}
