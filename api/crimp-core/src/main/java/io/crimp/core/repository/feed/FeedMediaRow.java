package io.crimp.core.repository.feed;

import io.crimp.core.entity.enums.MediaKind;

/**
 * 피드 카드 미디어 한 행의 평탄화 프로젝션 (PR-F2).
 *
 * <p>{@code post_media} (seq) + {@code media_assets} (kind, original_path/webp_path) 를 join 한 결과.
 * URL 절대값은 도메인 단계 ({@link io.crimp.domain.feed.FeedService}) 에서
 * {@code app.media.cdn-base-url} 과 저장 path 를 합성해 생성한다 — DB 에 절대 URL 을
 * 저장하지 않으므로 CDN 도메인 변경에도 데이터 backfill 불필요.
 *
 * @param feedPostId feed_posts.id (그룹 키)
 * @param seq        post_media.seq — 표시 순서 (이 record 자체는 seq 오름차순으로 도착)
 * @param kind       media_assets.kind (IMAGE / VIDEO)
 * @param originalPath       media_assets.original_path — 원본 CDN URL 합성의 경로 부분
 * @param webpPath           media_assets.webp_path — WebP 파생본 경로 (없으면 null)
 * @param posterOriginalPath VIDEO 전용: 대표 이미지 행의 original_path (없으면 null)
 * @param posterWebpPath     VIDEO 전용: 대표 이미지 행의 webp_path (없으면 null)
 */
public record FeedMediaRow(
        long feedPostId,
        short seq,
        MediaKind kind,
        String originalPath,
        String webpPath,
        String posterOriginalPath,
        String posterWebpPath
) {}
