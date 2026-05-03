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
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
 * <p>인증/요청 오류 같은 4xx 는 {@link KakaoLocalException} 으로 즉시 실패시킨다.
 * 네트워크 오류나 일시적인 서버 오류로 일부 페이지가 실패한 경우에는 그 페이지만
 * 스킵하고 누적 결과를 반환 — 단일 페이지 오류로 전체 동기화가 막히는 사고를 방지.
 */
@Component
@Profile("!test")
public class KakaoLocalGymClient implements GymSyncSource {

    private static final Logger log = LoggerFactory.getLogger(KakaoLocalGymClient.class);

    private final RestTemplate restTemplate;
    private final KakaoProperties auth;
    private final KakaoLocalProperties props;

    /**
     * 운영/테스트 공용 생성자 — Spring 이 {@link io.crimp.infra.http.HttpClientConfig}
     * 의 timeout-적용 RestTemplate 빈을 주입. 단위 테스트는 mock RestTemplate 직접 전달.
     *
     * <p>(PR #109) 이전 두 생성자 (no-RestTemplate @Autowired + 명시) 통합 — `new
     * RestTemplate()` 하드코딩으로 timeout 미설정이던 회귀 차단.
     */
    @Autowired
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

        // [PR #111] 다중 키워드로 검색 후 Kakao place id (externalKey) 기준 union dedup —
        // 동일 매장이 여러 키워드에 매칭되어도 결과는 1건. LinkedHashMap 으로 첫 매칭 순서 유지.
        Map<String, RemoteGym> byExternalKey = new LinkedHashMap<>();
        for (String keyword : props.resolvedQueryKeywords()) {
            fetchKeyword(keyword, lat, lng, radiusMeters, headers, request, byExternalKey);
        }
        return new ArrayList<>(byExternalKey.values());
    }

    private void fetchKeyword(String keyword,
                              BigDecimal lat,
                              BigDecimal lng,
                              int radiusMeters,
                              HttpHeaders headers,
                              HttpEntity<Void> request,
                              Map<String, RemoteGym> byExternalKey) {
        int maxPages = props.resolvedMaxPages();
        int beforeCount = byExternalKey.size();
        for (int page = 1; page <= maxPages; page++) {
            String uri = UriComponentsBuilder
                    .fromHttpUrl(props.resolvedBaseUrl())
                    .path(props.resolvedKeywordSearchPath())
                    .queryParam("query", keyword)
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
                    // [reviewer I1] x/y 가 비어있으면 (0,0) 좌표가 DB 에 들어가는 회귀를 막기 위해
                    // 해당 document 스킵. Kakao 응답에 좌표가 없으면 매장 위치 자체를 신뢰할 수 없음.
                    if (d.x() == null || d.x().isBlank() || d.y() == null || d.y().isBlank()) {
                        log.debug("[gym-sync/kakao] skip doc with blank coord: id={} name={}", d.id(), d.placeName());
                        continue;
                    }
                    if (d.id() == null || d.id().isBlank()) {
                        // externalKey 가 없는 doc 은 dedup 키로 사용 불가 — 안전하게 스킵.
                        log.debug("[gym-sync/kakao] skip doc with blank id: name={}", d.placeName());
                        continue;
                    }
                    // putIfAbsent — 이미 다른 키워드 호출에서 들어왔으면 첫 매칭 유지.
                    byExternalKey.putIfAbsent(d.id(), toRemoteGym(d));
                }
                if (body.meta() != null && Boolean.TRUE.equals(body.meta().isEnd())) break;
            } catch (HttpStatusCodeException e) {
                if (e.getStatusCode().is4xxClientError()) {
                    throw new KakaoLocalException("Kakao Local API 요청 실패: status="
                            + e.getStatusCode().value() + " body=" + summarize(e.getResponseBodyAsString()));
                }
                log.warn("[gym-sync/kakao] keyword='{}' page {} failed for ({},{}): status={} body={}",
                        keyword, page, lat, lng, e.getStatusCode().value(), summarize(e.getResponseBodyAsString()));
                // 5xx 는 일시 오류일 수 있으므로 기존 partial-result 정책 유지.
                break;
            } catch (RestClientException e) {
                log.warn("[gym-sync/kakao] keyword='{}' page {} failed for ({},{}): {}",
                        keyword, page, lat, lng, e.getMessage());
                // 한 페이지 실패는 해당 키워드의 후속 페이지만 스킵 — 다음 키워드는 계속.
                break;
            }
        }
        log.debug("[gym-sync/kakao] keyword='{}' added {} new docs (cumulative {})",
                keyword, byExternalKey.size() - beforeCount, byExternalKey.size());
    }

    private static RemoteGym toRemoteGym(Document d) {
        // 호출자가 빈 좌표 doc 을 사전에 스킵하므로 여기서는 단순 변환.
        BigDecimal lat = new BigDecimal(d.y());
        BigDecimal lng = new BigDecimal(d.x());
        // brand 는 Kakao 응답에 직접 없으므로 placeName 의 prefix 추정 — 정확도가 낮아
        // 도메인 측 BrandNormalizer 에서 보강. 여기서는 raw 그대로 반환.
        String brand = inferBrand(d.placeName());
        String addr = d.roadAddressName() != null && !d.roadAddressName().isBlank()
                ? d.roadAddressName() : d.addressName();
        return new RemoteGym(d.id(), d.placeName(), brand, addr, lat, lng, d.phone());
    }

    /**
     * Kakao place name 에서 brand 를 추정한다.
     *
     * <p>알고리즘 — placeName 이 공백을 포함하고 마지막 토큰이 "점" 으로 끝나면, 그 직전
     * 까지의 prefix 를 brand 로 본다. 즉 "더클라임 강남점" → "더클라임",
     * "Foo Bar Baz점" → "Foo Bar". 다중 공백 케이스에서 마지막 토큰만 "지점" 으로 처리하는
     * 점은 의도된 단순화 (Kakao Local 응답 분석 결과 대부분 "브랜드 + 단일 지점명" 패턴).
     *
     * <p>"점" 이 없거나 공백이 없으면 placeName 전체를 brand 로 반환 — `BrandNormalizer`
     * 가 후속 단계에서 표준화 (검색·필터에서는 canonical 매칭).
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

    private static String summarize(String body) {
        if (body == null || body.isBlank()) return "";
        String compact = body.replaceAll("\\s+", " ").trim();
        if (compact.length() <= 200) return compact;
        return compact.substring(0, 200) + "...";
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
