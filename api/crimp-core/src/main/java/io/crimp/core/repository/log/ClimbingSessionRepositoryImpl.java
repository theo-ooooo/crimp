package io.crimp.core.repository.log;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.log.ClimbingSession;
import io.crimp.core.entity.log.QClimbingSession;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.util.List;

public class ClimbingSessionRepositoryImpl implements ClimbingSessionRepositoryCustom {

    private final JPAQueryFactory jpaQueryFactory;

    public ClimbingSessionRepositoryImpl(JPAQueryFactory jpaQueryFactory) {
        this.jpaQueryFactory = jpaQueryFactory;
    }

    @Override
    public Slice<ClimbingSession> searchMine(long userId, Long cursorId, Pageable pageable) {
        QClimbingSession s = QClimbingSession.climbingSession;
        int pageSize = pageable.getPageSize();

        BooleanBuilder where = new BooleanBuilder(s.userId.eq(userId).and(s.deletedAt.isNull()));
        if (cursorId != null) where.and(s.id.lt(cursorId));

        List<ClimbingSession> rows = jpaQueryFactory
                .selectFrom(s)
                .where(where)
                .orderBy(s.id.desc())
                .limit(pageSize + 1L)
                .fetch();

        boolean hasNext = rows.size() > pageSize;
        List<ClimbingSession> content = hasNext ? rows.subList(0, pageSize) : rows;
        return new SliceImpl<>(content, pageable, hasNext);
    }
}
