package io.crimp.infra.media;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * S3 미디어 업로드 어댑터 설정.
 *
 * <p>자격증명 해석 우선순위 (위에서 아래로 — 가장 위가 우선):
 * <ol>
 *   <li>{@link #profile} — {@code ~/.aws/credentials} 의 named profile (로컬 개발 권장)</li>
 *   <li>{@link #accessKey}/{@link #secretKey} — 정적 IAM 키 (CI 등 명시 필요 시)</li>
 *   <li>그 외 — AWS SDK 의 default credential chain (env, IAM Task Role 등) — 운영 ECS 권장</li>
 * </ol>
 *
 * <p>(staging — Cloudflare R2 호환) {@link #endpointUrl} 가 설정되면 SDK 의 endpoint
 * override 로 동작 — R2 같은 S3-compatible 스토리지로 우회. R2 는 path-style 접근만
 * 지원하므로 {@link #pathStyleAccessEnabled} 도 함께 {@code true} 로 둔다.
 * (AWS S3 사용 시는 둘 다 비워둠 — virtual-hosted style 자동.)
 *
 * @param bucket                  업로드 대상 버킷 이름 (R2 의 경우도 동일)
 * @param region                  AWS 리전 (예: {@code ap-northeast-2}). R2 는 region 무관이라 관용적으로 {@code auto}.
 * @param profile                 {@code ~/.aws/credentials} 의 named profile (로컬 개발). 비우면 미사용.
 * @param accessKey               IAM access key (또는 R2 토큰의 access key id) — CI/명시 필요 시.
 * @param secretKey               IAM secret key (또는 R2 토큰의 secret) — 동일.
 * @param endpointUrl             S3-compatible endpoint (R2: {@code https://<account_id>.r2.cloudflarestorage.com}).
 *                                AWS S3 사용 시 비움.
 * @param pathStyleAccessEnabled  {@code true} 면 path-style URL 사용 ({@code https://endpoint/bucket/key}).
 *                                R2 필수, AWS S3 는 기본 false (virtual-hosted) 권장.
 */
@ConfigurationProperties(prefix = "app.media.s3")
public record S3Properties(
        String bucket,
        String region,
        String profile,
        String accessKey,
        String secretKey,
        String endpointUrl,
        boolean pathStyleAccessEnabled
) {
}
