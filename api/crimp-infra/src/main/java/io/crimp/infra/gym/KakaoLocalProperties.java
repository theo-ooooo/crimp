package io.crimp.infra.gym;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Kakao Local API 설정.
 *
 * <p>Kakao 의 검색 API 는 REST API 키를 사용한다 ({@code KAKAO_REST_API_KEY} —
 * 인증 흐름과 동일 키). 본 properties 는 검색 동작 파라미터만 담는다.
 *
 * @param baseUrl 기본 {@code https://dapi.kakao.com}.
 * @param keywordSearchPath 키워드 검색 path. 기본 {@code /v2/local/search/keyword.json}.
 * @param defaultRadiusMeters 한 호출에서 검색할 반경. Kakao 상한 20000(20km).
 * @param queryKeyword 매장 검색에 사용할 한글 키워드. 기본 {@code 클라이밍}.
 * @param pageSize 1 호출당 결과 수. Kakao 최대 15.
 * @param maxPages 한 좌표 호출에서 최대 몇 페이지까지 가져올지 (페이지네이션).
 */
@ConfigurationProperties(prefix = "app.gym-sync.kakao-local")
public record KakaoLocalProperties(
        String baseUrl,
        String keywordSearchPath,
        Integer defaultRadiusMeters,
        String queryKeyword,
        Integer pageSize,
        Integer maxPages
) {

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

    public String resolvedQueryKeyword() {
        return queryKeyword != null && !queryKeyword.isBlank() ? queryKeyword : "클라이밍";
    }

    public int resolvedPageSize() {
        return pageSize != null && pageSize > 0 ? Math.min(pageSize, 15) : 15;
    }

    public int resolvedMaxPages() {
        return maxPages != null && maxPages > 0 ? maxPages : 3;
    }
}
