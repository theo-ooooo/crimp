package io.crimp.core.repository.gym;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.gym.QRoute;
import io.crimp.core.entity.gym.Route;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.util.List;

/**
 * RouteRepositoryCustom 의 QueryDSL 구현.
 * Spring Data JPA 네이밍 컨벤션({EntityRepository}Impl)에 따라 자동 연결된다.
 */
public class RouteRepositoryImpl implements RouteRepositoryCustom {

    private final JPAQueryFactory jpaQueryFactory;

    public RouteRepositoryImpl(JPAQueryFactory jpaQueryFactory) {
        this.jpaQueryFactory = jpaQueryFactory;
    }

    @Override
    public Slice<Route> findByGymIdCursor(long gymId, Long cursorId, Pageable pageable) {
        QRoute route = QRoute.route;
        int pageSize = pageable.getPageSize();

        BooleanBuilder where = new BooleanBuilder(route.gymId.eq(gymId).and(route.removedAt.isNull()));
        if (cursorId != null) where.and(route.id.lt(cursorId));

        List<Route> rows = jpaQueryFactory
                .selectFrom(route)
                .where(where)
                .orderBy(route.id.desc())
                .limit(pageSize + 1L)
                .fetch();

        boolean hasNext = rows.size() > pageSize;
        List<Route> content = hasNext ? rows.subList(0, pageSize) : rows;
        return new SliceImpl<>(content, pageable, hasNext);
    }
}
