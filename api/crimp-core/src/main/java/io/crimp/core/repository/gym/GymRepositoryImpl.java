package io.crimp.core.repository.gym;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.gym.QGym;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.util.List;

/**
 * GymRepositoryCustom 의 QueryDSL 구현.
 * Spring Data JPA 가 {EntityRepository}Impl 네이밍 컨벤션으로 자동 연결.
 */
public class GymRepositoryImpl implements GymRepositoryCustom {

    private final JPAQueryFactory jpaQueryFactory;

    public GymRepositoryImpl(JPAQueryFactory jpaQueryFactory) {
        this.jpaQueryFactory = jpaQueryFactory;
    }

    @Override
    public Slice<Gym> search(Long cursorId, String keyword, String brand, Pageable pageable) {
        QGym gym = QGym.gym;
        int pageSize = pageable.getPageSize();

        BooleanBuilder where = new BooleanBuilder(gym.status.eq(GymStatus.ACTIVE));
        if (cursorId != null) where.and(gym.id.lt(cursorId));
        if (keyword != null) where.and(gym.name.contains(keyword));
        if (brand != null) where.and(gym.brand.eq(brand));

        List<Gym> rows = jpaQueryFactory
                .selectFrom(gym)
                .where(where)
                .orderBy(gym.id.desc())
                .limit(pageSize + 1L)
                .fetch();

        boolean hasNext = rows.size() > pageSize;
        List<Gym> content = hasNext ? rows.subList(0, pageSize) : rows;
        return new SliceImpl<>(content, pageable, hasNext);
    }
}
