package io.crimp.core.repository.crew;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.crew.QCrew;
import io.crimp.core.entity.crew.QCrewJoinRequest;
import io.crimp.core.entity.crew.QCrewMember;
import io.crimp.core.entity.enums.CrewJoinRequestStatus;
import io.crimp.core.entity.enums.CrewMemberStatus;
import io.crimp.core.entity.enums.CrewVisibility;
import io.crimp.core.entity.enums.UserStatus;
import io.crimp.core.entity.gym.QGym;
import io.crimp.core.entity.user.QProfile;
import io.crimp.core.entity.user.QUser;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.util.List;
import java.util.Optional;

public class CrewRepositoryImpl implements CrewRepositoryCustom {

    private final JPAQueryFactory jpaQueryFactory;

    public CrewRepositoryImpl(JPAQueryFactory jpaQueryFactory) {
        this.jpaQueryFactory = jpaQueryFactory;
    }

    @Override
    public Slice<CrewSearchRow> searchPublic(Long cursorId, String keyword, String region, String gymExtId,
                                             io.crimp.core.entity.enums.CrewLevelBand levelBand,
                                             io.crimp.core.entity.enums.CrewStyle style,
                                             Long viewerUserId, Pageable pageable) {
        QCrew crew = QCrew.crew;
        int pageSize = pageable.getPageSize();
        List<CrewSearchRow> rows = baseQuery(viewerUserId)
                .where(publicWhere(cursorId, keyword, region, gymExtId, levelBand, style))
                .orderBy(crew.id.desc())
                .limit(pageSize + 1L)
                .fetch();

        boolean hasNext = rows.size() > pageSize;
        List<CrewSearchRow> content = hasNext ? rows.subList(0, pageSize) : rows;
        return new SliceImpl<>(content, pageable, hasNext);
    }

    @Override
    public Optional<CrewSearchRow> findPublicDetail(String extId, Long viewerUserId) {
        QCrew crew = QCrew.crew;
        CrewSearchRow row = baseQuery(viewerUserId)
                .where(new BooleanBuilder()
                        .and(crew.extId.eq(extId))
                        .and(crew.visibility.eq(CrewVisibility.PUBLIC))
                        .and(crew.deletedAt.isNull()))
                .fetchOne();
        return Optional.ofNullable(row);
    }

    private com.querydsl.jpa.impl.JPAQuery<CrewSearchRow> baseQuery(Long viewerUserId) {
        QCrew crew = QCrew.crew;
        QGym gym = QGym.gym;
        QUser owner = new QUser("crewOwner");
        QProfile ownerProfile = new QProfile("crewOwnerProfile");
        QCrewMember myMember = new QCrewMember("myCrewMember");
        QCrewJoinRequest myRequest = new QCrewJoinRequest("myCrewJoinRequest");
        BooleanBuilder ownerDeleted = new BooleanBuilder()
                .or(owner.deletedAt.isNotNull())
                .or(owner.status.eq(UserStatus.DELETED));

        return jpaQueryFactory
                .select(Projections.constructor(CrewSearchRow.class,
                        crew.id,
                        crew.extId,
                        crew.name,
                        crew.summary,
                        crew.description,
                        crew.region,
                        crew.imageMediaId,
                        crew.levelBand,
                        crew.style,
                        crew.joinPolicy,
                        crew.capacity,
                        crew.memberCount,
                        crew.createdAt,
                        gym.extId,
                        gym.name,
                        new CaseBuilder().when(ownerDeleted).then((String) null).otherwise(owner.extId),
                        new CaseBuilder().when(ownerDeleted).then("탈퇴사용자").otherwise(ownerProfile.nickname),
                        myMember.role,
                        myMember.status,
                        myRequest.extId
                ))
                .from(crew)
                .leftJoin(gym).on(gym.id.eq(crew.homeGymId))
                .join(owner).on(owner.id.eq(crew.ownerUserId))
                .leftJoin(ownerProfile).on(ownerProfile.userId.eq(crew.ownerUserId))
                .leftJoin(myMember).on(myMember.crewId.eq(crew.id)
                        .and(myMember.userId.eq(viewerUserId))
                        .and(myMember.status.eq(CrewMemberStatus.ACTIVE)))
                .leftJoin(myRequest).on(myRequest.crewId.eq(crew.id)
                        .and(myRequest.userId.eq(viewerUserId))
                        .and(myRequest.status.eq(CrewJoinRequestStatus.PENDING)));
    }

    private static BooleanBuilder publicWhere(Long cursorId, String keyword, String region, String gymExtId,
                                              io.crimp.core.entity.enums.CrewLevelBand levelBand,
                                              io.crimp.core.entity.enums.CrewStyle style) {
        QCrew crew = QCrew.crew;
        QGym gym = QGym.gym;
        BooleanBuilder where = new BooleanBuilder()
                .and(crew.visibility.eq(CrewVisibility.PUBLIC))
                .and(crew.deletedAt.isNull());
        if (cursorId != null) where.and(crew.id.lt(cursorId));
        if (keyword != null) where.and(crew.name.contains(keyword).or(crew.summary.contains(keyword)));
        if (region != null) where.and(crew.region.contains(region));
        if (gymExtId != null) where.and(gym.extId.eq(gymExtId));
        if (levelBand != null) where.and(crew.levelBand.eq(levelBand));
        if (style != null) where.and(crew.style.eq(style));
        return where;
    }
}
