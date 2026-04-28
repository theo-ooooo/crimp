package io.crimp.infra.media;

import io.crimp.domain.media.MediaPresigner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.ProfileCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.time.Instant;

/**
 * AWS S3 presigner 기반 {@link MediaPresigner} 구현.
 *
 * <p>자격증명 우선순위:
 * <ol>
 *   <li>{@code app.media.s3.profile} — {@code ~/.aws/credentials} 의 named profile (로컬 개발 권장)</li>
 *   <li>{@code app.media.s3.access-key}/{@code secret-key} — 정적 IAM 키</li>
 *   <li>그 외 — AWS SDK default credential chain (env, IAM Task Role 등) — 운영 ECS 권장</li>
 * </ol>
 *
 * <p>버킷 / 리전이 비어있으면 빈 등록 자체가 실패 — Spring Boot 가 application 시작 시점에
 * 명확한 에러 메시지로 알려준다 (필수 설정 누락).
 */
@Component
@Profile("!test")
public class S3MediaPresigner implements MediaPresigner {

    private static final Logger log = LoggerFactory.getLogger(S3MediaPresigner.class);

    private final S3Properties props;
    private final S3Presigner presigner;

    public S3MediaPresigner(S3Properties props) {
        this.props = props;
        if (props.bucket() == null || props.bucket().isBlank()) {
            throw new IllegalStateException("app.media.s3.bucket 미설정");
        }
        if (props.region() == null || props.region().isBlank()) {
            throw new IllegalStateException("app.media.s3.region 미설정");
        }
        AwsCredentialsProvider creds = resolveCredentials(props);
        this.presigner = S3Presigner.builder()
                .region(Region.of(props.region()))
                .credentialsProvider(creds)
                .build();
    }

    private static AwsCredentialsProvider resolveCredentials(S3Properties p) {
        if (p.profile() != null && !p.profile().isBlank()) {
            log.info("[media/s3] using AWS profile '{}' for bucket {}", p.profile(), p.bucket());
            return ProfileCredentialsProvider.create(p.profile());
        }
        if (p.accessKey() != null && !p.accessKey().isBlank()
                && p.secretKey() != null && !p.secretKey().isBlank()) {
            log.info("[media/s3] using static credentials for bucket {}", p.bucket());
            return StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(p.accessKey(), p.secretKey()));
        }
        log.info("[media/s3] using default credential chain for bucket {}", p.bucket());
        return DefaultCredentialsProvider.create();
    }

    @Override
    public PresignedUpload presignPut(String s3Key, String contentType, long contentLength, Duration ttl) {
        // contentLength 가 서명에 포함되어 클라가 다른 바이트 수로 PUT 시 S3 가 거부.
        // 단 이는 정확한 크기 일치 검증 (POST policy 의 content-length-range 와 다름) — Phase 1 단순화.
        // 추가 방어로 S3 버킷 정책의 max object size 도입 권장 (별도 인프라 PR).
        PutObjectRequest put = PutObjectRequest.builder()
                .bucket(props.bucket())
                .key(s3Key)
                .contentType(contentType)
                .contentLength(contentLength)
                .build();
        PutObjectPresignRequest req = PutObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .putObjectRequest(put)
                .build();
        PresignedPutObjectRequest signed = presigner.presignPutObject(req);
        // [PR #90 리뷰 I3] SDK 가 실제 서명에 사용한 만료 시각 사용 — Instant.now().plus 와 ms 단위 차이 회피.
        return new PresignedUpload(signed.url().toString(), signed.expiration());
    }
}
