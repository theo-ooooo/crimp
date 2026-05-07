package io.crimp.core.repository.feed;

import io.crimp.core.entity.enums.MediaKind;

/**
 * 피드 카드 미디어 한 행의 평탄화 프로젝션 (PR-F2).
 *
 * <p>{@code post_media} (seq) + {@code media_assets} + 타입별 variant/thumbnail 테이블을 join 한 결과.
 * URL 절대값은 도메인 단계 ({@link io.crimp.domain.feed.FeedService}) 에서
 * {@code app.media.cdn-base-url} 과 저장 path 를 합성해 생성한다 — DB 에 절대 URL 을
 * 저장하지 않으므로 CDN 도메인 변경에도 데이터 backfill 불필요.
 *
 * @param feedPostId feed_posts.id (그룹 키)
 * @param seq        post_media.seq — 표시 순서 (이 record 자체는 seq 오름차순으로 도착)
 * @param kind       media_assets.kind (IMAGE / VIDEO)
 * @param originalPath  media_assets.original_path — 원본 CDN URL 합성의 경로 부분
 * @param variantPath   대표 이미지/비디오 variant 경로 (없으면 null)
 * @param thumbnailPath VIDEO 전용 대표 썸네일 경로 (없으면 null)
 */
public record FeedMediaRow(
        long feedPostId,
        short seq,
        MediaKind kind,
        String originalPath,
        String variantPath,
        String thumbnailPath
) {}
