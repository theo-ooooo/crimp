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
import io.crimp.core.entity.media.QMediaImageVariant;
import io.crimp.core.entity.media.QMediaVideoThumbnail;
import io.crimp.core.entity.media.QMediaVideoVariant;
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
                        p.avatarMediaId,
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
        QMediaImageVariant imageVariant = new QMediaImageVariant("imageVariant");
        QMediaImageVariant imageVariantCandidate = new QMediaImageVariant("imageVariantCandidate");
        QMediaVideoVariant videoVariant = new QMediaVideoVariant("videoVariant");
        QMediaVideoVariant videoVariantCandidate = new QMediaVideoVariant("videoVariantCandidate");
        QMediaVideoThumbnail thumbnail = QMediaVideoThumbnail.mediaVideoThumbnail;
        QMediaVideoThumbnail thumbnailCandidate = new QMediaVideoThumbnail("thumbnailCandidate");
        QMediaAsset thumbnailImage = new QMediaAsset("thumbnailImage");
        QMediaImageVariant thumbnailImageVariant = new QMediaImageVariant("thumbnailImageVariant");
        QMediaImageVariant thumbnailImageVariantCandidate = new QMediaImageVariant("thumbnailImageVariantCandidate");
        return queryFactory
                .select(Projections.constructor(
                        FeedMediaRow.class,
                        pm.id.postId,
                        pm.seq,
                        m.kind,
                        Expressions.stringTemplate("coalesce({0}, {1})", imageVariant.path, videoVariant.path),
                        Expressions.stringTemplate("coalesce({0}, {1})",
                                thumbnail.path, thumbnailImageVariant.path)))
                .from(pm)
                .join(m).on(pm.id.mediaId.eq(m.id))
                .leftJoin(imageVariant).on(imageVariant.mediaId.eq(m.id)
                        .and(imageVariant.status.eq(MediaStatus.READY))
                        .and(imageVariant.primary.isTrue())
                        .and(imageVariant.id.eq(JPAExpressions
                                .select(imageVariantCandidate.id.max())
                                .from(imageVariantCandidate)
                                .where(imageVariantCandidate.mediaId.eq(m.id)
                                        .and(imageVariantCandidate.status.eq(MediaStatus.READY))
                                        .and(imageVariantCandidate.primary.isTrue())))))
                .leftJoin(videoVariant).on(videoVariant.mediaId.eq(m.id)
                        .and(videoVariant.status.eq(MediaStatus.READY))
                        .and(videoVariant.primary.isTrue())
                        .and(videoVariant.id.eq(JPAExpressions
                                .select(videoVariantCandidate.id.max())
                                .from(videoVariantCandidate)
                                .where(videoVariantCandidate.mediaId.eq(m.id)
                                        .and(videoVariantCandidate.status.eq(MediaStatus.READY))
                                        .and(videoVariantCandidate.primary.isTrue())))))
                .leftJoin(thumbnail).on(thumbnail.videoMediaId.eq(m.id)
                        .and(thumbnail.status.eq(MediaStatus.READY))
                        .and(thumbnail.primary.isTrue())
                        .and(thumbnail.id.eq(JPAExpressions
                                .select(thumbnailCandidate.id.max())
                                .from(thumbnailCandidate)
                                .where(thumbnailCandidate.videoMediaId.eq(m.id)
                                        .and(thumbnailCandidate.status.eq(MediaStatus.READY))
                                        .and(thumbnailCandidate.primary.isTrue())))))
                .leftJoin(thumbnailImage).on(thumbnail.imageMediaId.eq(thumbnailImage.id)
                        .and(thumbnailImage.status.eq(MediaStatus.READY)))
                .leftJoin(thumbnailImageVariant).on(thumbnailImageVariant.mediaId.eq(thumbnailImage.id)
                        .and(thumbnailImageVariant.status.eq(MediaStatus.READY))
                        .and(thumbnailImageVariant.primary.isTrue())
                        .and(thumbnailImageVariant.id.eq(JPAExpressions
                                .select(thumbnailImageVariantCandidate.id.max())
                                .from(thumbnailImageVariantCandidate)
                                .where(thumbnailImageVariantCandidate.mediaId.eq(thumbnailImage.id)
                                        .and(thumbnailImageVariantCandidate.status.eq(MediaStatus.READY))
                                        .and(thumbnailImageVariantCandidate.primary.isTrue())))))
                // status=READY 만 노출. UPLOADING / PROCESSING / FAILED 모두 클라에 흘리지 않음.
                .where(pm.id.postId.in(feedPostIds).and(m.status.eq(MediaStatus.READY)))
                .orderBy(pm.id.postId.asc(), pm.seq.asc())
                .fetch();
    }

    @Override
    public List<FeedAvatarRow> findAvatarVariantsForMediaIds(Collection<Long> mediaIds) {
        if (mediaIds == null || mediaIds.isEmpty()) {
            return List.of();
        }
        QMediaImageVariant variant = new QMediaImageVariant("avatarBatchVariant");
        QMediaImageVariant candidate = new QMediaImageVariant("avatarBatchVariantCandidate");
        return queryFactory
                .select(Projections.constructor(
                        FeedAvatarRow.class,
                        variant.mediaId,
                        variant.path))
                .from(variant)
                .where(variant.mediaId.in(mediaIds)
                        .and(variant.status.eq(MediaStatus.READY))
                        .and(variant.primary.isTrue())
                        .and(variant.id.eq(JPAExpressions
                                .select(candidate.id.max())
                                .from(candidate)
                                .where(candidate.mediaId.eq(variant.mediaId)
                                        .and(candidate.status.eq(MediaStatus.READY))
                                        .and(candidate.primary.isTrue())))))
                .fetch();
    }
}
