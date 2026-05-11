package io.crimp.infra.gym;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Kakao Local API 설정.
 *
 * <p>Kakao 의 검색 API 는 REST API 키를 사용한다 ({@code KAKAO_REST_API_KEY} —
 * 인증 흐름과 동일 키). 본 properties 는 검색 동작 파라미터만 담는다.
 *
 * @param baseUrl 기본 {@code https://dapi.kakao.com}.
 * @param keywordSearchPath 키워드 검색 path. 기본 {@code /v2/local/search/keyword.json}.
 * @param defaultRadiusMeters 한 호출에서 검색할 반경. Kakao 상한 20000(20km).
 * @param queryKeyword (단일) 매장 검색 키워드. 기본 {@code 클라이밍}. 호환성 유지 — 신규
 *                     케이스는 {@link #queryKeywords} 사용 권장.
 * @param queryKeywords (다중) 매장 검색 키워드 목록 (PR #111). 비어있으면 {@link #queryKeyword}
 *                      한 개로 fallback. Kakao 가 같은 매장을 여러 표기로 등록하는 케이스를
 *                      포괄하기 위해 ["더클라임", "클라이밍파크", "볼더프렌즈"] 등
 *                      브랜드/상호명 중심 다중 호출 후 union dedup.
 * @param pageSize 1 호출당 결과 수. Kakao 최대 15.
 * @param maxPages 한 좌표·키워드 호출에서 최대 몇 페이지까지 가져올지 (페이지네이션).
 *                 Kakao Local keyword search 의 page 허용 범위는 1..45 이므로 그 이상은 45로 제한.
 * @param requestDelayMs Kakao Local 요청 사이 지연(ms). 기본 0. 운영에서 짧은 rate limit 에
 *                       걸리면 100~300ms 정도로 조정한다.
 */
@ConfigurationProperties(prefix = "app.gym-sync.kakao-local")
public record KakaoLocalProperties(
        String baseUrl,
        String keywordSearchPath,
        Integer defaultRadiusMeters,
        String queryKeyword,
        List<String> queryKeywords,
        Integer pageSize,
        Integer maxPages,
        Long requestDelayMs
) {

    private static final List<String> DEFAULT_KEYWORDS = List.of(
            "더클라임", "클라이밍파크", "볼더프렌즈", "손상원클라이밍", "서울숲클라이밍",
            "손상원", "비블럭", "오프더월", "캐치스톤", "웨이브락", "오프더월클라이밍"
    );

    public String resolvedBaseUrl() {
        return baseUrl != null && !baseUrl.isBlank() ? baseUrl : "https://dapi.kakao.com";
    }

    public String resolvedKeywordSearchPath() {
        return keywordSearchPath != null && !keywordSearchPath.isBlank()
                ? keywordSearchPath
                : "/v2/local/search/keyword.json";
    }

    public int resolvedRadiusMeters() {
        return defaultRadiusMeters != null && defaultRadiusMeters > 0
                ? defaultRadiusMeters : 5000;
    }

    /**
     * (단일) 키워드 — 호환성 유지. 호출자는 보통 {@link #resolvedQueryKeywords()} 사용.
     */
    public String resolvedQueryKeyword() {
        return queryKeyword != null && !queryKeyword.isBlank() ? queryKeyword : "클라이밍";
    }

    /**
     * 다중 키워드 (PR #111). queryKeywords 가 명시되면 그대로, 비어있으면 queryKeyword 한 개,
     * 둘 다 비어있으면 {@link #DEFAULT_KEYWORDS} fallback.
     */
    public List<String> resolvedQueryKeywords() {
        if (queryKeywords != null && !queryKeywords.isEmpty()) {
            return queryKeywords.stream().filter(s -> s != null && !s.isBlank()).toList();
        }
        if (queryKeyword != null && !queryKeyword.isBlank()) {
            return List.of(queryKeyword);
        }
        return DEFAULT_KEYWORDS;
    }

    public int resolvedPageSize() {
        return pageSize != null && pageSize > 0 ? Math.min(pageSize, 15) : 15;
    }

    public int resolvedMaxPages() {
        if (maxPages == null || maxPages <= 0) {
            return 2;
        }
        return Math.min(maxPages, 45);
    }

    public long resolvedRequestDelayMs() {
        return requestDelayMs != null && requestDelayMs > 0 ? requestDelayMs : 0L;
    }
}
