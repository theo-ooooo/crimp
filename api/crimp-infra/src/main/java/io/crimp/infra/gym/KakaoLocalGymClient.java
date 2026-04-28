package io.crimp.infra.gym;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.crimp.domain.gym.sync.GymSyncSource;
import io.crimp.domain.gym.sync.RemoteGym;
import io.crimp.infra.auth.KakaoProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Kakao Local API 의 키워드 검색 어댑터. {@link GymSyncSource} 도메인 포트 구현.
 *
 * <p>API: {@code GET https://dapi.kakao.com/v2/local/search/keyword.json}
 *  - 헤더: {@code Authorization: KakaoAK <REST_API_KEY>}
 *  - 파라미터: {@code query=클라이밍, x=lng, y=lat, radius=meters, size=15, page=1..N}
 *  - 응답: {@code documents[]} — 매장 정보, {@code meta.is_end} 로 페이지 종료 판정.
 *
 * <p>{@code crimp-infra/auth/KakaoProperties} 의 {@code restApiKey} 를 그대로 재사용한다
 * — OAuth 흐름과 동일 앱·동일 키.
 *
 * <p>외부 호출 실패는 {@link KakaoLocalException} 으로 wrap. 어댑터가 일부 페이지 실패
 * 시에는 그 페이지만 스킵하고 누적 결과를 반환 — 단일 페이지 오류로 전체 동기화가
 * 막히는 사고를 방지.
 */
@Component
@Profile("!test")
public class KakaoLocalGymClient implements GymSyncSource {

    private static final Logger log = LoggerFactory.getLogger(KakaoLocalGymClient.class);

    private final RestTemplate restTemplate;
    private final KakaoProperties auth;
    private final KakaoLocalProperties props;

    @Autowired
    public KakaoLocalGymClient(KakaoProperties auth, KakaoLocalProperties props) {
        this(new RestTemplate(), auth, props);
    }

    /** 단위 테스트에서 RestTemplate 을 주입할 수 있도록 공개. */
    public KakaoLocalGymClient(RestTemplate restTemplate, KakaoProperties auth, KakaoLocalProperties props) {
        this.restTemplate = restTemplate;
        this.auth = auth;
        this.props = props;
    }

    @Override
    public List<RemoteGym> fetchByRadius(BigDecimal lat, BigDecimal lng, int radiusMeters) {
        if (auth.restApiKey() == null || auth.restApiKey().isBlank()) {
            throw new KakaoLocalException("KAKAO_REST_API_KEY 가 비어있어 검색을 호출할 수 없음");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "KakaoAK " + auth.restApiKey());
        HttpEntity<Void> request = new HttpEntity<>(headers);

        List<RemoteGym> all = new ArrayList<>();
        int maxPages = props.resolvedMaxPages();
        for (int page = 1; page <= maxPages; page++) {
            String uri = UriComponentsBuilder
                    .fromHttpUrl(props.resolvedBaseUrl())
                    .path(props.resolvedKeywordSearchPath())
                    .queryParam("query", props.resolvedQueryKeyword())
                    .queryParam("x", lng)
                    .queryParam("y", lat)
                    .queryParam("radius", radiusMeters)
                    .queryParam("size", props.resolvedPageSize())
                    .queryParam("page", page)
                    .encode()
                    .toUriString();

            try {
                ResponseEntity<KeywordResponse> resp = restTemplate.exchange(
                        uri, HttpMethod.GET, request, KeywordResponse.class);
                KeywordResponse body = resp.getBody();
                if (body == null || body.documents() == null) break;
                for (Document d : body.documents()) {
                    all.add(toRemoteGym(d));
                }
                if (body.meta() != null && Boolean.TRUE.equals(body.meta().isEnd())) break;
            } catch (RestClientException e) {
                log.warn("[gym-sync/kakao] page {} failed for ({},{}): {}", page, lat, lng, e.getMessage());
                // 한 페이지 실패는 해당 페이지만 스킵하고 종료 — 누적 결과는 반환.
                break;
            }
        }
        return all;
    }

    private static RemoteGym toRemoteGym(Document d) {
        BigDecimal lat = d.y() != null ? new BigDecimal(d.y()) : BigDecimal.ZERO;
        BigDecimal lng = d.x() != null ? new BigDecimal(d.x()) : BigDecimal.ZERO;
        // brand 는 Kakao 응답에 직접 없으므로 placeName 의 prefix 추정 — 정확도가 낮아
        // 도메인 측 BrandNormalizer 에서 보강. 여기서는 raw 그대로 반환.
        String brand = inferBrand(d.placeName());
        String addr = d.roadAddressName() != null && !d.roadAddressName().isBlank()
                ? d.roadAddressName() : d.addressName();
        return new RemoteGym(d.id(), d.placeName(), brand, addr, lat, lng, d.phone());
    }

    /**
     * Kakao place name 에서 brand 추정. "더클라임 강남점" → "더클라임" 식으로 첫 토큰 또는
     * 알려진 브랜드 prefix 매칭. 정확도가 낮아 후속 단계의 BrandNormalizer 에서 표준화.
     */
    private static String inferBrand(String placeName) {
        if (placeName == null || placeName.isBlank()) return null;
        // " ~점" 패턴 — 마지막 공백 직전 토큰을 brand 로 간주.
        int idx = placeName.lastIndexOf(' ');
        if (idx > 0) {
            String tail = placeName.substring(idx + 1);
            if (tail.endsWith("점")) {
                return placeName.substring(0, idx);
            }
        }
        return placeName;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record KeywordResponse(
            List<Document> documents,
            Meta meta
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Document(
            @JsonProperty("id") String id,
            @JsonProperty("place_name") String placeName,
            @JsonProperty("address_name") String addressName,
            @JsonProperty("road_address_name") String roadAddressName,
            @JsonProperty("phone") String phone,
            @JsonProperty("x") String x,
            @JsonProperty("y") String y
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Meta(
            @JsonProperty("is_end") Boolean isEnd
    ) {
    }

    public static class KakaoLocalException extends RuntimeException {
        public KakaoLocalException(String message) {
            super(message);
        }
    }
}
