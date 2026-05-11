package io.crimp.core.repository.crew;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.crew.CrewMeetup;
import io.crimp.core.entity.crew.QCrew;
import io.crimp.core.entity.crew.QCrewMeetup;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.core.entity.gym.QGym;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class CrewMeetupRepositoryImpl implements CrewMeetupRepositoryCustom {

    private final JPAQueryFactory jpaQueryFactory;

    public CrewMeetupRepositoryImpl(JPAQueryFactory jpaQueryFactory) {
        this.jpaQueryFactory = jpaQueryFactory;
    }

    @Override
    public List<CrewMeetup> searchUpcoming(
            Instant now,
            BigDecimal centerLat,
            BigDecimal centerLng,
            CrewLevelBand levelBand,
            CrewStyle style,
            boolean outdoor,
            Pageable pageable) {
        QCrewMeetup meetup = QCrewMeetup.crewMeetup;
        QCrew crew = QCrew.crew;
        QGym gym = QGym.gym;

        BooleanBuilder where = new BooleanBuilder()
                .and(meetup.deletedAt.isNull())
                .and(meetup.startsAt.goe(now));

        boolean nearMode = centerLat != null && centerLng != null;
        var effectiveGymId = new CaseBuilder()
                .when(meetup.gymId.isNotNull()).then(meetup.gymId)
                .otherwise(crew.homeGymId);
        if (nearMode) {
            where.and(gym.id.isNotNull());
        }
        if (levelBand != null) {
            where.and(crew.id.isNotNull())
                    .and(crew.levelBand.eq(levelBand).or(crew.levelBand.eq(CrewLevelBand.ALL)));
        }
        if (style != null) {
            if (style == CrewStyle.LEAD) {
                where.and(crew.style.in(CrewStyle.LEAD, CrewStyle.BOTH));
            } else {
                where.and(crew.style.eq(style).or(crew.style.eq(CrewStyle.BOTH)));
            }
        }
        if (outdoor) {
            where.and(
                    meetup.title.containsIgnoreCase("외벽")
                            .or(meetup.title.containsIgnoreCase("야외"))
                            .or(meetup.title.containsIgnoreCase("아웃도어"))
                            .or(meetup.title.containsIgnoreCase("outdoor"))
                            .or(meetup.description.containsIgnoreCase("외벽"))
                            .or(meetup.description.containsIgnoreCase("야외"))
                            .or(meetup.description.containsIgnoreCase("아웃도어"))
                            .or(meetup.description.containsIgnoreCase("outdoor"))
                            .or(meetup.location.containsIgnoreCase("외벽"))
                            .or(meetup.location.containsIgnoreCase("야외"))
                            .or(meetup.location.containsIgnoreCase("아웃도어"))
                            .or(meetup.location.containsIgnoreCase("outdoor"))
                            .or(gym.featuresJson.containsIgnoreCase("outdoor"))
                            .or(gym.featuresJson.containsIgnoreCase("outside"))
            );
        }

        var query = jpaQueryFactory
                .selectFrom(meetup)
                .leftJoin(crew).on(crew.id.eq(meetup.crewId).and(crew.deletedAt.isNull()))
                .leftJoin(gym).on(gym.id.eq(effectiveGymId))
                .where(where)
                .limit(pageable.getPageSize());

        if (nearMode) {
            var distance = com.querydsl.core.types.dsl.Expressions.numberTemplate(
                    Double.class,
                    "sqrt(power({0} - {1}, 2) + power({2} - {3}, 2))",
                    gym.lat,
                    centerLat,
                    gym.lng,
                    centerLng);
            query.orderBy(distance.asc(), meetup.startsAt.asc(), meetup.id.asc());
        } else {
            query.orderBy(meetup.startsAt.asc(), meetup.id.asc());
        }
        return query.fetch();
    }
}
