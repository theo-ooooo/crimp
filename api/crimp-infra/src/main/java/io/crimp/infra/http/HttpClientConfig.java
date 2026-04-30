package io.crimp.infra.http;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * 외부 HTTP 호출용 RestTemplate 공용 설정 (PR #109).
 *
 * <p>Kakao OAuth / Apple OAuth / Kakao Local API 등 외부 통신 클라이언트가 모두 동일한
 * timeout / 기본 설정을 공유하도록 단일 빈 정의. 이전엔 각 클라이언트가 {@code new
 * RestTemplate()} 로 생성해 connect/read timeout 이 설정되지 않아, 외부 서비스 응답
 * 지연 시 백엔드 스레드가 무한 대기하는 위험이 있었다.
 *
 * <p>timeout 기준:
 * <ul>
 *   <li><b>connect</b> 3s — TCP/TLS handshake. 정상이면 100ms 미만이라 3s 면 충분.</li>
 *   <li><b>read</b> 10s — 응답 본문 read. OAuth /token 은 보통 &lt; 1s 이지만 네트워크
 *       악조건(외부 회선 패킷 손실 등) 고려해 여유 있게.</li>
 * </ul>
 *
 * <p>{@code @Profile("!test")} 가 붙어 단위 테스트는 클라이언트가 직접 {@link RestTemplate}
 * 을 생성/주입해 mock 화한다 (기존 패턴 유지).
 */
@Configuration
@Profile("!test")
public class HttpClientConfig {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        // Spring Boot 3.3.x — setConnectTimeout / setReadTimeout (3.4+ 부터 connectTimeout/
        // readTimeout 짧은 별칭 추가). 향후 boot 업그레이드 시 단축형으로 정리 가능.
        return builder
                .setConnectTimeout(CONNECT_TIMEOUT)
                .setReadTimeout(READ_TIMEOUT)
                .build();
    }
}
