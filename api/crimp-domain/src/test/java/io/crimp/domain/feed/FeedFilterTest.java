package io.crimp.domain.feed;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FeedFilterTest {

    @Test
    void null_or_blank_falls_back_to_POPULAR() {
        assertThat(FeedFilter.fromQuery(null)).isEqualTo(FeedFilter.POPULAR);
        assertThat(FeedFilter.fromQuery("")).isEqualTo(FeedFilter.POPULAR);
        assertThat(FeedFilter.fromQuery("   ")).isEqualTo(FeedFilter.POPULAR);
    }

    @Test
    void popular_case_insensitive() {
        assertThat(FeedFilter.fromQuery("popular")).isEqualTo(FeedFilter.POPULAR);
        assertThat(FeedFilter.fromQuery("POPULAR")).isEqualTo(FeedFilter.POPULAR);
        assertThat(FeedFilter.fromQuery("Popular")).isEqualTo(FeedFilter.POPULAR);
    }

    @Test
    void my_gym_supports_hyphen_underscore_and_camel() {
        // 사양: "my-gym" 표준. 하이픈/언더스코어/대소문자 변형 모두 허용해야 클라이언트 호환성 안전.
        assertThat(FeedFilter.fromQuery("my-gym")).isEqualTo(FeedFilter.MY_GYM);
        assertThat(FeedFilter.fromQuery("MY-GYM")).isEqualTo(FeedFilter.MY_GYM);
        assertThat(FeedFilter.fromQuery("my_gym")).isEqualTo(FeedFilter.MY_GYM);
        assertThat(FeedFilter.fromQuery("MY_GYM")).isEqualTo(FeedFilter.MY_GYM);
        assertThat(FeedFilter.fromQuery("myGym")).isEqualTo(FeedFilter.MY_GYM);
        assertThat(FeedFilter.fromQuery("MyGym")).isEqualTo(FeedFilter.MY_GYM);
    }

    @Test
    void friends_case_insensitive() {
        assertThat(FeedFilter.fromQuery("friends")).isEqualTo(FeedFilter.FRIENDS);
        assertThat(FeedFilter.fromQuery("FRIENDS")).isEqualTo(FeedFilter.FRIENDS);
        assertThat(FeedFilter.fromQuery("Friends")).isEqualTo(FeedFilter.FRIENDS);
    }

    @Test
    void unknown_token_falls_back_to_POPULAR() {
        // 알 수 없는 값은 400 던지지 않고 silent fallback. 잘못된 클라이언트 deeplink 가
        // 빈 화면이 되는 UX 회귀를 방지.
        assertThat(FeedFilter.fromQuery("unknown")).isEqualTo(FeedFilter.POPULAR);
        assertThat(FeedFilter.fromQuery("trending")).isEqualTo(FeedFilter.POPULAR);
        assertThat(FeedFilter.fromQuery("__")).isEqualTo(FeedFilter.POPULAR);
    }
}
