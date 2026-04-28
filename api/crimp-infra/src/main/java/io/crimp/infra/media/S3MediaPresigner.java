package io.crimp.infra.media;

import io.crimp.domain.media.MediaPresigner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
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
 * <p>{@code app.media.s3.access-key} / {@code secret-key} 가 비어있으면 AWS SDK 의
 * default credential chain (IAM Role, env, ~/.aws/credentials 등) 을 사용. 운영 ECS 에서는
 * Task Role 만 부여하고 access-key 는 비워둔다.
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
        var builder = S3Presigner.builder().region(Region.of(props.region()));
        if (props.accessKey() != null && !props.accessKey().isBlank()
                && props.secretKey() != null && !props.secretKey().isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(props.accessKey(), props.secretKey())));
            log.info("[media/s3] using static credentials for bucket {}", props.bucket());
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
            log.info("[media/s3] using default credential chain for bucket {}", props.bucket());
        }
        this.presigner = builder.build();
    }

    @Override
    public PresignedUpload presignPut(String s3Key, String contentType, Duration ttl) {
        PutObjectRequest put = PutObjectRequest.builder()
                .bucket(props.bucket())
                .key(s3Key)
                .contentType(contentType)
                .build();
        PutObjectPresignRequest req = PutObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .putObjectRequest(put)
                .build();
        PresignedPutObjectRequest signed = presigner.presignPutObject(req);
        return new PresignedUpload(signed.url().toString(), Instant.now().plus(ttl));
    }
}
