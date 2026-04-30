package io.crimp.infra.gym;

import io.crimp.domain.gym.sync.RemoteGym;
import io.crimp.infra.auth.KakaoProperties;
import io.crimp.infra.gym.KakaoLocalGymClient.Document;
import io.crimp.infra.gym.KakaoLocalGymClient.KakaoLocalException;
import io.crimp.infra.gym.KakaoLocalGymClient.KeywordResponse;
import io.crimp.infra.gym.KakaoLocalGymClient.Meta;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * {@link KakaoLocalGymClient} 단위 테스트 — RestTemplate 모킹.
 */
class KakaoLocalGymClientTest {

    private static final BigDecimal LAT = new BigDecimal("37.5008");
    private static final BigDecimal LNG = new BigDecimal("127.0376");

    private KakaoProperties auth(String key) {
        return new KakaoProperties(
                "test-client-id", "https://kauth.kakao.com", "https://x/jwks.json",
                key, "", "https://kauth.kakao.com/oauth/token", List.of());
    }

    private KakaoLocalProperties props() {
        // 모든 필드 null → record 의 default 메서드가 합리적 default 반환.
        // (PR #111) queryKeywords 추가 — null 이면 단일 queryKeyword 또는 DEFAULT_KEYWORDS fallback.
        return new KakaoLocalProperties(null, null, null, null, null, null, null);
    }

    private Document doc(String id, String name, String addr, String roadAddr, String x, String y, String phone) {
        return new Document(id, name, addr, roadAddr, phone, x, y);
    }

    @Test
    void fetch_throwsWhenRestApiKeyMissing() {
        RestTemplate rt = mock(RestTemplate.class);
        var client = new KakaoLocalGymClient(rt, auth(""), props());
        assertThatThrownBy(() -> client.fetchByRadius(LAT, LNG, 5000))
                .isInstanceOf(KakaoLocalException.class)
                .hasMessageContaining("KAKAO_REST_API_KEY");
    }

    @Test
    void fetch_singlePage_returnsAllDocuments() {
        RestTemplate rt = mock(RestTemplate.class);
        KeywordResponse stub = new KeywordResponse(
                List.of(
                        doc("1", "더클라임 강남점", "서울 강남구 역삼동 123",
                                "서울 강남구 테헤란로8길 21", "127.0376", "37.5008", "02-111"),
                        doc("2", "볼더프렌즈 홍대점", "서울 마포구 서교동 356-1",
                                null, "126.9237", "37.5567", "02-222")
                ),
                new Meta(true)
        );
        when(rt.exchange(any(String.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(KeywordResponse.class)))
                .thenReturn(ResponseEntity.ok(stub));

        var client = new KakaoLocalGymClient(rt, auth("REST-KEY"), props());
        List<RemoteGym> result = client.fetchByRadius(LAT, LNG, 5000);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).name()).isEqualTo("더클라임 강남점");
        assertThat(result.get(0).address()).isEqualTo("서울 강남구 테헤란로8길 21");
        assertThat(result.get(0).brand()).isEqualTo("더클라임");
        assertThat(result.get(0).lat()).isEqualByComparingTo("37.5008");
        assertThat(result.get(0).lng()).isEqualByComparingTo("127.0376");

        // road_address_name 이 비면 address_name 으로 폴백.
        assertThat(result.get(1).address()).isEqualTo("서울 마포구 서교동 356-1");
    }

    @Test
    void fetch_paginates_untilIsEnd() {
        RestTemplate rt = mock(RestTemplate.class);
        KeywordResponse page1 = new KeywordResponse(
                List.of(doc("a", "X 1점", "주소1", null, "127", "37", null)),
                new Meta(false));
        KeywordResponse page2 = new KeywordResponse(
                List.of(doc("b", "Y 2점", "주소2", null, "127", "37", null)),
                new Meta(true));
        // 첫 호출은 page1, 두 번째는 page2 반환.
        when(rt.exchange(contains("page=1"), eq(HttpMethod.GET), any(HttpEntity.class), eq(KeywordResponse.class)))
                .thenReturn(ResponseEntity.ok(page1));
        when(rt.exchange(contains("page=2"), eq(HttpMethod.GET), any(HttpEntity.class), eq(KeywordResponse.class)))
                .thenReturn(ResponseEntity.ok(page2));

        var client = new KakaoLocalGymClient(rt, auth("REST-KEY"), props());
        var result = client.fetchByRadius(LAT, LNG, 5000);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(RemoteGym::name).containsExactly("X 1점", "Y 2점");
    }

    @Test
    void fetch_pageError_returnsAccumulated() {
        RestTemplate rt = mock(RestTemplate.class);
        KeywordResponse page1 = new KeywordResponse(
                List.of(doc("a", "X 1점", "주소1", null, "127", "37", null)),
                new Meta(false));
        when(rt.exchange(contains("page=1"), eq(HttpMethod.GET), any(HttpEntity.class), eq(KeywordResponse.class)))
                .thenReturn(ResponseEntity.ok(page1));
        when(rt.exchange(contains("page=2"), eq(HttpMethod.GET), any(HttpEntity.class), eq(KeywordResponse.class)))
                .thenThrow(new RestClientException("network failure"));

        var client = new KakaoLocalGymClient(rt, auth("REST-KEY"), props());
        var result = client.fetchByRadius(LAT, LNG, 5000);

        // page 2 실패 → page 1 의 1건만 반환 (전체 호출 실패 아님).
        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("X 1점");
    }

    @Test
    void inferBrand_extractsPrefixForBranchSuffix() {
        // private 메서드 대신 public 결과의 brand 필드로 검증.
        RestTemplate rt = mock(RestTemplate.class);
        KeywordResponse stub = new KeywordResponse(
                List.of(doc("1", "더클라임 신논현점", "주소", null, "127", "37", null)),
                new Meta(true));
        when(rt.exchange(any(String.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(KeywordResponse.class)))
                .thenReturn(ResponseEntity.ok(stub));

        var client = new KakaoLocalGymClient(rt, auth("REST-KEY"), props());
        var result = client.fetchByRadius(LAT, LNG, 5000);
        assertThat(result.get(0).brand()).isEqualTo("더클라임");
    }
}
