package io.crimp.core.repository.feed;

import io.crimp.core.entity.enums.MediaKind;

/**
 * 피드 카드 미디어 한 행의 평탄화 프로젝션 (PR-F2).
 *
 * <p>{@code post_media} (seq) + {@code media_assets} (kind, cdn_url, thumbnail_cdn_url)
 * 를 join 한 결과. 도메인 단계 ({@link io.crimp.domain.feed.FeedService}) 에서
 * postId 별로 group + cdnUrl 이 null 인 항목 제외 후 응답에 매핑.
 *
 * @param feedPostId      feed_posts.id (그룹 키)
 * @param seq             post_media.seq — 표시 순서 (이 record 자체는 seq 오름차순으로 도착)
 * @param kind            media_assets.kind (IMAGE / VIDEO)
 * @param cdnUrl          media_assets.cdn_url (cdn-base-url 미설정 시 null — 도메인에서 제외)
 * @param thumbnailCdnUrl media_assets.thumbnail_cdn_url (없으면 null — 클라가 cdnUrl 그대로 사용)
 */
public record FeedMediaRow(
        long feedPostId,
        short seq,
        MediaKind kind,
        String cdnUrl,
        String thumbnailCdnUrl
) {}
