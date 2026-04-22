package io.crimp.core.config;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * JPAQueryFactory 를 빈으로 노출해 QueryDSL 기반 Custom Repository Impl 이 주입받게 한다.
 *
 * \u0060test\u0060 프로파일은 JPA autoconfig 를 제외하므로 EntityManager 가 없어 빈 생성이 실패한다.
 * 현 MVP 에선 test 컨텍스트가 JPA 없이 로드되므로 \u0060!test\u0060 가드로 우회.
 * Testcontainers 기반 통합 테스트 도입 시 이 가드를 제거하고 test 에서도 활성화한다.
 */
@Configuration
@Profile("!test")
public class QueryDslConfig {

    @Bean
    public JPAQueryFactory jpaQueryFactory(EntityManager em) {
        return new JPAQueryFactory(em);
    }
}
