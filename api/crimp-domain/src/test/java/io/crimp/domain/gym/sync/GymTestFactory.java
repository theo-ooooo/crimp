package io.crimp.domain.gym.sync;

import io.crimp.core.entity.gym.Gym;

import java.math.BigDecimal;

/**
 * 테스트 전용 {@link Gym} 인스턴스 생성기.
 *
 * <p>{@link Gym} 은 운영 코드에서 새 row 를 만들 때 {@link Gym#create} 정적 팩토리만
 * 노출하므로(brand/phone/id setter 미제공), 단위 테스트에서 이 필드들을 채우려면
 * reflection 이 필요하다. 본 헬퍼가 그 reflection 을 한 곳에 모아 테스트 본문을
 * 깔끔하게 유지한다 (PR #84 리뷰 I3).
 *
 * <p>운영 코드에는 본 헬퍼를 의존하지 않는다 — 테스트 디렉토리(`src/test`) 에 한정.
 */
final class GymTestFactory {

    private GymTestFactory() {}

    static Gym gym(long id, String name, String address, BigDecimal lat, BigDecimal lng, String brand, String phone) {
        Gym g = Gym.create("01HCRMPGYM0000000000TEST" + id, name, address, lat, lng);
        setField(g, "id", id);
        setField(g, "brand", brand);
        setField(g, "phone", phone);
        return g;
    }

    private static void setField(Gym target, String name, Object value) {
        try {
            var f = Gym.class.getDeclaredField(name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to set Gym." + name + " for test", e);
        }
    }
}
