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
 * @param bucket    업로드 대상 S3 버킷 이름
 * @param region    버킷 리전 (예: ap-northeast-2)
 * @param profile   {@code ~/.aws/credentials} 의 named profile 이름 (예: "crimp-dev"). 비어있으면 미사용.
 * @param accessKey IAM access key — CI/명시 필요 시. 운영에서는 비워두고 Task Role 사용.
 * @param secretKey IAM secret key — 동일.
 */
@ConfigurationProperties(prefix = "app.media.s3")
public record S3Properties(
        String bucket,
        String region,
        String profile,
        String accessKey,
        String secretKey
) {
}
