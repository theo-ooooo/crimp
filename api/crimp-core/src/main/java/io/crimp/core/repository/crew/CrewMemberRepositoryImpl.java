package io.crimp.core.repository.crew;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.crew.QCrew;
import io.crimp.core.entity.crew.QCrewMember;
import io.crimp.core.entity.enums.CrewMemberStatus;
import io.crimp.core.entity.user.QProfile;
import io.crimp.core.entity.user.QUser;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.util.List;

public class CrewMemberRepositoryImpl implements CrewMemberRepositoryCustom {

    private final JPAQueryFactory jpaQueryFactory;

    public CrewMemberRepositoryImpl(JPAQueryFactory jpaQueryFactory) {
        this.jpaQueryFactory = jpaQueryFactory;
    }

    @Override
    public Slice<CrewMemberRow> searchActiveByCrew(Long crewId, Long cursorUserId, Pageable pageable) {
        QCrewMember member = QCrewMember.crewMember;
        QCrew crew = QCrew.crew;
        QUser user = new QUser("crewMemberUser");
        QProfile profile = new QProfile("crewMemberProfile");
        int pageSize = pageable.getPageSize();

        List<CrewMemberRow> rows = jpaQueryFactory
                .select(Projections.constructor(CrewMemberRow.class,
                        member.crewId,
                        crew.extId,
                        member.userId,
                        user.extId,
                        profile.nickname,
                        member.role,
                        member.status,
                        member.joinedAt
                ))
                .from(member)
                .join(crew).on(crew.id.eq(member.crewId))
                .join(user).on(user.id.eq(member.userId))
                .leftJoin(profile).on(profile.userId.eq(member.userId))
                .where(where(crewId, cursorUserId))
                .orderBy(member.userId.desc())
                .limit(pageSize + 1L)
                .fetch();

        boolean hasNext = rows.size() > pageSize;
        List<CrewMemberRow> content = hasNext ? rows.subList(0, pageSize) : rows;
        return new SliceImpl<>(content, pageable, hasNext);
    }

    private static BooleanBuilder where(Long crewId, Long cursorUserId) {
        QCrewMember member = QCrewMember.crewMember;
        BooleanBuilder where = new BooleanBuilder()
                .and(member.crewId.eq(crewId))
                .and(member.status.eq(CrewMemberStatus.ACTIVE));
        if (cursorUserId != null) where.and(member.userId.lt(cursorUserId));
        return where;
    }
}
