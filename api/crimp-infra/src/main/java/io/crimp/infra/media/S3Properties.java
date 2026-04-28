package io.crimp.infra.media;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * S3 미디어 업로드 어댑터 설정.
 *
 * <p>버킷·리전·자격증명은 운영에서 IAM Role / Secrets Manager 로 주입. 로컬 개발에서는
 * env 변수 또는 application-local.yml 로 채울 수 있다.
 *
 * @param bucket    업로드 대상 S3 버킷 이름
 * @param region    버킷 리전 (예: ap-northeast-2)
 * @param accessKey IAM access key — 로컬·테스트용. 운영에서는 비워두고 default credential chain 사용.
 * @param secretKey IAM secret key — 로컬·테스트용.
 */
@ConfigurationProperties(prefix = "app.media.s3")
public record S3Properties(
        String bucket,
        String region,
        String accessKey,
        String secretKey
) {
}
