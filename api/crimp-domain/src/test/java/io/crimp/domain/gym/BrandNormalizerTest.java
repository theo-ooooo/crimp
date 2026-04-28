package io.crimp.domain.gym;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link BrandNormalizer} 의 입력 정규화 / synonym lookup 회귀 테스트.
 *
 * <p>새 브랜드를 추가할 때 본 테스트의 케이스를 함께 늘려 회귀를 막는다.
 */
class BrandNormalizerTest {

    private final BrandNormalizer normalizer = new BrandNormalizer();

    @Test
    void returnsNullForNullInput() {
        assertThat(normalizer.normalize(null)).isNull();
    }

    @Test
    void returnsEmptyForBlankInput() {
        assertThat(normalizer.normalize("")).isEmpty();
        assertThat(normalizer.normalize("   ")).isEmpty();
    }

    @Test
    void canonicalKoreanBrandPassesThroughUnchanged() {
        assertThat(normalizer.normalize("더클라임")).isEqualTo("더클라임");
        assertThat(normalizer.normalize("클라이밍파크")).isEqualTo("클라이밍파크");
        assertThat(normalizer.normalize("볼더프렌즈")).isEqualTo("볼더프렌즈");
    }

    @Test
    void koreanWithSpaceMatchesCanonical() {
        // "더 클라임" (공백) → "더클라임"
        assertThat(normalizer.normalize("더 클라임")).isEqualTo("더클라임");
    }

    @Test
    void englishLowercaseMatchesCanonical() {
        assertThat(normalizer.normalize("theclimb")).isEqualTo("더클라임");
        assertThat(normalizer.normalize("climbingpark")).isEqualTo("클라이밍파크");
        assertThat(normalizer.normalize("boulderfriends")).isEqualTo("볼더프렌즈");
    }

    @Test
    void englishMixedCaseAndSpaceMatchesCanonical() {
        assertThat(normalizer.normalize("The Climb")).isEqualTo("더클라임");
        assertThat(normalizer.normalize("THE CLIMB")).isEqualTo("더클라임");
        assertThat(normalizer.normalize("Climbing Park")).isEqualTo("클라이밍파크");
    }

    @Test
    void hyphenAndUnderscoreVariantsMatch() {
        assertThat(normalizer.normalize("the-climb")).isEqualTo("더클라임");
        assertThat(normalizer.normalize("the_climb")).isEqualTo("더클라임");
        assertThat(normalizer.normalize("boulder-friends")).isEqualTo("볼더프렌즈");
    }

    @Test
    void leadingTrailingWhitespaceTrimmed() {
        assertThat(normalizer.normalize("  더클라임  ")).isEqualTo("더클라임");
        assertThat(normalizer.normalize("\tThe Climb\n")).isEqualTo("더클라임");
    }

    @Test
    void unknownBrandReturnsTrimmedInput() {
        // 사전에 없으면 trim 만 적용해 그대로 반환 — DB 에 동일 표기가 있다면 매칭, 없으면 0건.
        assertThat(normalizer.normalize("새로운암장")).isEqualTo("새로운암장");
        assertThat(normalizer.normalize("  Foo Bar  ")).isEqualTo("Foo Bar");
    }

    @Test
    void shortenedSynonymMatchesCanonical() {
        // 손상원클라이밍 의 짧은 형태
        assertThat(normalizer.normalize("손상원")).isEqualTo("손상원클라이밍");
    }

    @Test
    void unicodeWhitespaceVariantsMatch() {
        // 한글 IME / 모바일에서 자주 섞이는 유니코드 공백 — NBSP, 전각 공백, 줄바꿈.
        // (PR #83 리뷰 I1)
        assertThat(normalizer.normalize("더 클라임")).isEqualTo("더클라임");   // NBSP
        assertThat(normalizer.normalize("더　클라임")).isEqualTo("더클라임");   // 전각 공백
        assertThat(normalizer.normalize("The\nClimb")).isEqualTo("더클라임");        // 줄바꿈
        assertThat(normalizer.normalize("The Climb")).isEqualTo("더클라임");
    }
}
