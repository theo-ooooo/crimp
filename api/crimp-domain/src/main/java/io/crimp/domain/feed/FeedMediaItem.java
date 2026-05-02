package io.crimp.domain.feed;

import io.crimp.core.entity.enums.MediaKind;

/**
 * 피드 카드에 노출되는 미디어 1개.
 *
 * <p>{@code url} 은 {@code app.media.cdn-base-url} 과 {@code media_assets.s3_key} 를 응답
 * 시점에 합성한 절대 URL. base 가 미설정이면 미디어가 모두 응답에서 제외되어 클라가 깨진
 * 이미지를 표시하지 않는다.
 *
 * <p>{@code thumbnailUrl} 은 트랜스코드 도입 (Phase 1.5) 전까지 항상 null. 클라는 비디오면
 * url 자체로 첫 프레임 미리보기를 시도하거나 정적 placeholder 표시.
 *
 * @param kind          IMAGE / VIDEO
 * @param url           CDN URL (필수)
 * @param thumbnailUrl  썸네일 CDN URL (현 단계 항상 null)
 */
public record FeedMediaItem(
        MediaKind kind,
        String url,
        String thumbnailUrl
) {}
