package io.crimp.common.id;

import com.github.f4b6a3.ulid.UlidCreator;

/**
 * ULID (Crockford Base32, 26 chars) generator.
 * 상위 48비트 타임스탬프(ms) + 하위 80비트 랜덤 → 자연스러운 시간 정렬·중복 회피.
 * 모든 ext_id 발급은 이 클래스를 경유.
 */
public final class UlidGenerator {

    private UlidGenerator() {}

    public static String next() {
        return UlidCreator.getUlid().toString();
    }
}
