package io.crimp.domain.feed;

import io.crimp.core.entity.enums.MediaKind;

/**
 * 피드 카드에 노출되는 미디어 1개 (PR-F2).
 *
 * <p>{@code MediaAsset} 의 cdnUrl 만 빌려와 노출 — 본 record 는 클라가 그대로 렌더할 수 있는
 * 형태로 압축. 썸네일이 없으면 {@code thumbnailUrl} 은 null (클라가 원본 url 을 그대로 표시).
 *
 * <p>{@code url} 은 {@code MediaService.buildCdnUrl} 결과로, {@code app.media.cdn-base-url}
 * (Cloudflare R2 public/Custom Domain) 이 미설정이면 null 가능. {@code FeedService} 에서
 * null url 인 항목은 응답에서 제외해 클라가 깨진 이미지를 표시하지 않도록 한다.
 *
 * @param kind          IMAGE / VIDEO
 * @param url           CDN URL (필수 — 비어있으면 응답에서 제외)
 * @param thumbnailUrl  썸네일 CDN URL (없으면 null)
 */
public record FeedMediaItem(
        MediaKind kind,
        String url,
        String thumbnailUrl
) {}
