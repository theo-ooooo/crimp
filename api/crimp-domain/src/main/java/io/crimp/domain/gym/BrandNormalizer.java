package io.crimp.domain.gym;

import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 브랜드 검색 입력의 시각·언어 변형을 canonical 브랜드명으로 정규화한다.
 *
 * <p>예) `더 클라임` (공백 포함), `theclimb`, `The Climb`, `the-climb` 등이 들어와도
 * 모두 `더클라임` 으로 매칭. {@link GymService#search} 가 본 컴포넌트로 정규화한 뒤
 * 리포지토리의 정확 일치(`gym.brand.eq(...)`) 에 전달한다.
 *
 * <p>Phase 1 정책 — 인메모리 정적 사전. synonym 빈도가 낮고 변경 빈도도 낮아 DB
 * 테이블화는 후속(Phase 1.5+) 에서 admin 도구와 함께 도입.
 *
 * <p>입력 정규화 규칙:
 * <ol>
 *   <li>{@code null} / 빈 문자열 → 그대로 반환 (검색에서 brand 필터 미적용 의미)</li>
 *   <li>모든 공백·하이픈 제거 (예: `더 클라임` → `더클라임`)</li>
 *   <li>영문은 lower-case 비교 (예: `The Climb` ↔ `theclimb`)</li>
 *   <li>synonym 사전에 있으면 canonical 로 치환, 아니면 trim 한 원본 반환</li>
 * </ol>
 *
 * <p>새 브랜드 추가 시 {@link #SYNONYMS} 에 한국어 canonical 키 + 영문/공백 변형을
 * value list 로 추가한다. {@code @ConfigurationProperties} 로 외부화는 후속 PR 에서.
 */
@Component
public class BrandNormalizer {

    /**
     * canonical 브랜드명 → 변형 표기 list. canonical 자체도 항상 매칭되어야 하므로
     * 변환 테이블 빌드 시 자동 추가된다.
     */
    private static final Map<String, java.util.List<String>> SYNONYMS = Map.of(
            "더클라임",     java.util.List.of("theclimb", "the climb", "the-climb", "더 클라임", "더클라임짐"),
            "클라이밍파크", java.util.List.of("climbing park", "climbingpark", "climbing-park"),
            "볼더프렌즈",   java.util.List.of("boulder friends", "bouldering friends", "boulderfriends", "boulder-friends"),
            "손상원클라이밍", java.util.List.of("손상원", "sonsangwon", "ssw climbing"),
            "비블럭",       java.util.List.of("biblock", "be block", "비-블럭")
    );

    /**
     * 정규화된 입력 → canonical 브랜드명. 빌드 시점에 한 번 계산.
     */
    private static final Map<String, String> NORMALIZED_TO_CANONICAL = buildLookup();

    /**
     * 검색 입력을 canonical 브랜드명으로 정규화. 매칭되는 synonym 이 없으면 trim 한
     * 원본을 반환 (DB 에 없는 브랜드는 어차피 매칭 0건이라 그대로 전달).
     *
     * @param input 사용자/클라이언트가 넘긴 brand 문자열. {@code null} / 공백 허용.
     * @return canonical 또는 trim 한 원본. {@code null} / 빈 문자열은 그대로 반환.
     */
    public String normalize(String input) {
        if (input == null) return null;
        String trimmed = input.trim();
        if (trimmed.isEmpty()) return trimmed;
        String canonical = NORMALIZED_TO_CANONICAL.get(normalizeForLookup(trimmed));
        return canonical != null ? canonical : trimmed;
    }

    /**
     * lookup 키 정규화 — lower-case + 공백/하이픈 제거.
     * canonical 한국어와 영문 변형 모두 동일 키 공간으로 매핑.
     */
    private static String normalizeForLookup(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == ' ' || c == '-' || c == '_' || c == '\t') continue;
            sb.append(Character.toLowerCase(c));
        }
        return sb.toString();
    }

    private static Map<String, String> buildLookup() {
        Map<String, String> map = new java.util.HashMap<>();
        for (Map.Entry<String, java.util.List<String>> e : SYNONYMS.entrySet()) {
            String canonical = e.getKey();
            map.put(normalizeForLookup(canonical), canonical);
            for (String synonym : e.getValue()) {
                map.put(normalizeForLookup(synonym), canonical);
            }
        }
        return Map.copyOf(map);
    }
}
