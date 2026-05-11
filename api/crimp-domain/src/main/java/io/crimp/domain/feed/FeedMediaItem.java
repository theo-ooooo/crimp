package io.crimp.domain.feed;

import io.crimp.core.entity.enums.MediaKind;

/**
 * 피드 카드에 노출되는 미디어 1개.
 *
 * <p>{@code url} 은 {@code app.media.cdn-base-url} 과 타입별 대표 variant path
 * 또는 {@code media_assets.s3_key} 를 응답 시점에 합성한 절대 URL.
 * base 가 미설정이면 미디어가 모두 응답에서 제외되어 클라가 깨진
 * 이미지를 표시하지 않는다.
 *
 * <p>{@code thumbnailUrl} — VIDEO 인 경우: {@code media_video_thumbnails} 대표 행이 있으면 CDN URL.
 * 없으면 null.
 *
 * @param kind          IMAGE / VIDEO
 * @param url           CDN URL (필수)
 * @param thumbnailUrl  VIDEO 포스터 CDN URL (미설정 시 null)
 */
public record FeedMediaItem(
        MediaKind kind,
        String url,
        String thumbnailUrl
) {}
