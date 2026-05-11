package io.crimp.core.repository.feed;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.enums.UserStatus;
import io.crimp.core.entity.feed.QComment;
import io.crimp.core.entity.user.QProfile;
import io.crimp.core.entity.user.QUser;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.util.List;

/**
 * {@link CommentRepositoryCustom} QueryDSL 구현.
 *
 * <p>Spring Data JPA 명명 규칙 ({@code <CustomInterface>Impl}) 로 자동 결합.
 * {@code @Repository} 미부착 — standalone bean 으로 중복 등록되면 타입 주입 시 모호성.
 */
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
                        parent.extId,
                        u.deletedAt.isNotNull().or(u.status.eq(UserStatus.DELETED))))
                .from(c)
                .join(u).on(c.userId.eq(u.id))
                .leftJoin(p).on(p.userId.eq(u.id))
                // I3: 부모가 soft-delete 된 경우 parentExtId 를 노출하지 않는다 (자식 응답이
                // 더 이상 보이지 않는 부모를 참조하면 클라이언트의 "원댓글 보기" 가 404).
                // ON 조건에서 deletedAt 필터를 결합하면 일치 실패 → projection 의 parent.extId
                // 가 자연스럽게 NULL.
                .leftJoin(parent).on(c.parentId.eq(parent.id).and(parent.deletedAt.isNull()))
                .where(where)
                .orderBy(c.id.asc())
                .limit(pageSize + 1L)
                .fetch();

        boolean hasNext = rows.size() > pageSize;
        List<CommentRow> content = hasNext ? rows.subList(0, pageSize) : rows;
        return new SliceImpl<>(content, pageable, hasNext);
    }
}
