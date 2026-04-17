package io.crimp.core.entity.enums;

public enum UserStatus {
    ACTIVE(1),
    SUSPENDED(2),
    DELETED(9);

    private final int code;

    UserStatus(int code) {
        this.code = code;
    }

    public int code() {
        return code;
    }

    public static UserStatus of(int code) {
        for (UserStatus s : values()) {
            if (s.code == code) return s;
        }
        throw new IllegalArgumentException("Unknown UserStatus code: " + code);
    }
}
