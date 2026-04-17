package io.crimp.core.entity.enums;

public enum GymStatus {
    ACTIVE(1),
    CLOSED(9);

    private final int code;

    GymStatus(int code) {
        this.code = code;
    }

    public int code() {
        return code;
    }

    public static GymStatus of(int code) {
        for (GymStatus s : values()) {
            if (s.code == code) return s;
        }
        throw new IllegalArgumentException("Unknown GymStatus code: " + code);
    }
}
