package io.crimp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Crimp API 엔트리 포인트.
 *
 * <p>{@link EnableScheduling} 은 PR #110 의 GymSyncScheduler 등 cron 기반 작업이 동작하도록
 * 활성. 스케줄러 자체는 각 컴포넌트에서 {@code @Profile("!test")} 로 가드해 단위/통합 테스트
 * 컨텍스트에선 실행되지 않는다.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class CrimpApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(CrimpApiApplication.class, args);
    }
}
