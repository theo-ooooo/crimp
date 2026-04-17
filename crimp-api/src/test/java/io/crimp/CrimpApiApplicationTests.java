package io.crimp;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class CrimpApiApplicationTests {

    @Test
    void contextLoads() {
        // Spring context 기동 검증. DB·Redis는 test 프로파일에서 테스트컨테이너로 대체 예정.
    }
}
