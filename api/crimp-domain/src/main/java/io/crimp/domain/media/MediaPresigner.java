package io.crimp.domain.media;

import java.time.Duration;
import java.time.Instant;

/**
 * 미디어 업로드용 presigned URL 발급 포트.
 *
 * <p>도메인은 본 인터페이스에만 의존 — 실제 S3 / GCS / R2 구현은 {@code crimp-infra} 의 어댑터.
 * 이로써 도메인 단위 테스트가 외부 의존 없이 mock 으로 가능하다 (PR #90, Phase 1 MVP F5).
 */
public interface MediaPresigner {

    /**
     * {@code s3Key} 위치에 업로드 가능한 PUT presigned URL 을 발급한다.
     *
     * @param s3Key       오브젝트 키 (예: "media/2026-04-28/01HABC....jpg")
     * @param contentType 업로드 본문의 Content-Type 헤더 (예: "image/jpeg") — 발급한 URL 에
     *                    서명되어 있어 클라가 다른 Content-Type 으로 PUT 시 서명 불일치로 거부됨.
     * @param ttl         URL 유효 기간
     * @return 클라이언트가 PUT 으로 업로드할 수 있는 URL + 만료 시각
     */
    PresignedUpload presignPut(String s3Key, String contentType, Duration ttl);

    /**
     * 발급된 presigned URL 1건. 헤더는 클라이언트가 PUT 호출 시 그대로 첨부해야 한다 (서명에 포함됨).
     */
    record PresignedUpload(String url, Instant expiresAt) {}
}
