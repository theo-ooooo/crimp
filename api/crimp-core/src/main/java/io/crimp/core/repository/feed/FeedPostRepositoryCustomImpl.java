package io.crimp.core.repository.feed;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.core.entity.enums.PostVisibility;
import io.crimp.core.entity.feed.QFeedPost;
import io.crimp.core.entity.feed.QPostLike;
import io.crimp.core.entity.feed.QPostMedia;
import io.crimp.core.entity.gym.QGym;
import io.crimp.core.entity.log.QSessionAttempt;
import io.crimp.core.entity.media.QMediaAsset;
import io.crimp.core.entity.social.QFollow;
import io.crimp.core.entity.user.QProfile;
import io.crimp.core.entity.user.QUser;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.util.Collection;
import java.util.List;

/**
 * 피드 리포지토리 QueryDSL 구현 — FeedPost 루팅.
 *
 * <p>Spring Data JPA 명명 규칙 ({@code <CustomInterface>Impl}) 을 따라
 * {@code FeedPostRepository} 가 {@link FeedPostRepositoryCustom} 를 상속하면 본 클래스가
 * 자동 결합된다. JPA 리포지토리 팩토리가 직접 인스턴스화하므로 별도 {@code @Repository}
 * 또는 {@code @Component} 어노테이션 없음 (있으면 standalone bean 으로 중복 등록되어
 * {@link FeedPostRepositoryCustom} 타입 주입 시 모호성 발생).
 *
 * <p>JPA autoconfig 가 비활성인 테스트 프로파일에서는 {@code FeedPostRepository} 자체가
 * 등록되지 않아 본 클래스도 인스턴스화되지 않는다 ({@code QueryDslConfig} 의 {@code !test}
 * 가드와 동일 효과).
 */
public class FeedPostRepositoryCustomImpl implements FeedPostRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public FeedPostRepositoryCustomImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Slice<FeedRow> findFeed(
            long requesterUserId,
            FeedQueryMode mode,
            Long cursor,
            Long gymIdFilter,
            Pageable pageable) {

        QFeedPost fp = QFeedPost.feedPost;
        QSessionAttempt a = QSessionAttempt.sessionAttempt;
        QUser u = QUser.user;
        QProfile p = QProfile.profile;
        QGym g = QGym.gym;
        QPostLike l = QPostLike.postLike;
        QFollow follow = QFollow.follow;

        int pageSize = pageable.getPageSize();

        BooleanBuilder where = new BooleanBuilder()
                .and(fp.deletedAt.isNull())
                .and(u.deletedAt.isNull())
                // 가시성: PUBLIC 만 노출 (FOLLOWERS / PRIVATE 는 향후 별도 분기)
                .and(fp.visibility.eq(PostVisibility.PUBLIC));

        if (cursor != null) where.and(fp.id.lt(cursor));

        switch (mode) {
            case POPULAR -> {
                // 자동 게시는 SEND/FLASH/ONSIGHT 만 발생하므로 별도 result 필터 불필요
            }
            case MY_GYM -> {
                if (gymIdFilter == null) {
                    return new SliceImpl<>(List.of(), pageable, false);
                }
                where.and(fp.gymId.eq(gymIdFilter));
            }
            case FRIENDS -> {
                where.and(fp.userId.in(
                        JPAExpressions.select(follow.id.followeeId)
                                .from(follow)
                                .where(follow.id.followerId.eq(requesterUserId))));
            }
        }

        // liked 플래그: requester 의 likes row 존재 여부를 LEFT JOIN 으로 매핑
        BooleanExpression likedExpr = l.id.userId.isNotNull();

        List<FeedRow> rows = queryFactory
                .select(Projections.constructor(
                        FeedRow.class,
                        fp.id,
                        fp.extId,
                        fp.attemptId,
                        a.extId,
                        u.id,
                        u.extId,
                        p.nickname,
                        g.name,
                        a.result,
                        a.gradeValue,
                        a.gradeNumeric,
                        a.tagsJson,
                        // [PR #93, F5 PR-4] holdColor 1급 컬럼. 새 클라는 이쪽으로 보내고, 구버전
                        // 클라가 보낸 tagsJson 의 hold 키는 도메인 단에서 fallback 으로 활용.
                        a.holdColor,
                        // note: 자유 글이면 fp.content, 시도 자동 게시면 a.note (둘 다 nullable)
                        Expressions.stringTemplate("coalesce({0}, {1})", a.note, fp.content),
                        // loggedAt: 시도 게시면 a.loggedAt, 아니면 fp.createdAt fallback
                        Expressions.dateTimeTemplate(java.time.Instant.class,
                                "coalesce({0}, {1})", a.loggedAt, fp.createdAt),
                        fp.likeCount.longValue(),
                        fp.commentCount.longValue(),
                        likedExpr))
                .from(fp)
                .leftJoin(a).on(fp.attemptId.eq(a.id))
                .join(u).on(fp.userId.eq(u.id))
                .leftJoin(p).on(p.userId.eq(u.id))
                .leftJoin(g).on(fp.gymId.eq(g.id))
                .leftJoin(l).on(l.id.postId.eq(fp.id).and(l.id.userId.eq(requesterUserId)))
                .where(where)
                .orderBy(fp.id.desc())
                .limit(pageSize + 1L)
                .fetch();

        boolean hasNext = rows.size() > pageSize;
        List<FeedRow> content = hasNext ? rows.subList(0, pageSize) : rows;
        return new SliceImpl<>(content, pageable, hasNext);
    }

    @Override
    public List<FeedMediaRow> findFeedMediaForPosts(Collection<Long> feedPostIds) {
        if (feedPostIds == null || feedPostIds.isEmpty()) {
            return List.of();
        }
        QPostMedia pm = QPostMedia.postMedia;
        QMediaAsset m = QMediaAsset.mediaAsset;
        QMediaAsset poster = new QMediaAsset("posterMedia");
        return queryFactory
                .select(Projections.constructor(
                        FeedMediaRow.class,
                        pm.id.postId,
                        pm.seq,
                        m.kind,
                        m.originalPath,
                        m.webpPath,
                        poster.originalPath,
                        poster.webpPath))
                .from(pm)
                .join(m).on(pm.id.mediaId.eq(m.id))
                .leftJoin(poster).on(m.posterMediaId.eq(poster.id).and(poster.status.eq(MediaStatus.READY)))
                // status=READY 만 노출. UPLOADING / PROCESSING / FAILED 모두 클라에 흘리지 않음.
                .where(pm.id.postId.in(feedPostIds).and(m.status.eq(MediaStatus.READY)))
                .orderBy(pm.id.postId.asc(), pm.seq.asc())
                .fetch();
    }
}
