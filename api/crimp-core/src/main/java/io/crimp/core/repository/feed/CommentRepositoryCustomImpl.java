package io.crimp.core.repository.feed;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.feed.QComment;
import io.crimp.core.entity.user.QProfile;
import io.crimp.core.entity.user.QUser;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * {@link CommentRepositoryCustom} QueryDSL 구현.
 */
@Repository
@Profile("!test")
public class CommentRepositoryCustomImpl implements CommentRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public CommentRepositoryCustomImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Slice<CommentRow> listByPost(long postId, Long cursor, Pageable pageable) {
        QComment c = QComment.comment;
        QComment parent = new QComment("parent");
        QUser u = QUser.user;
        QProfile p = QProfile.profile;

        int pageSize = pageable.getPageSize();

        BooleanBuilder where = new BooleanBuilder()
                .and(c.postId.eq(postId))
                .and(c.deletedAt.isNull());
        if (cursor != null) where.and(c.id.gt(cursor));

        List<CommentRow> rows = queryFactory
                .select(Projections.constructor(
                        CommentRow.class,
                        c.id,
                        c.extId,
                        u.id,
                        u.extId,
                        p.nickname,
                        c.content,
                        c.createdAt,
                        parent.extId))
                .from(c)
                .join(u).on(c.userId.eq(u.id))
                .leftJoin(p).on(p.userId.eq(u.id))
                .leftJoin(parent).on(c.parentId.eq(parent.id))
                .where(where)
                .orderBy(c.id.asc())
                .limit(pageSize + 1L)
                .fetch();

        boolean hasNext = rows.size() > pageSize;
        List<CommentRow> content = hasNext ? rows.subList(0, pageSize) : rows;
        return new SliceImpl<>(content, pageable, hasNext);
    }
}
