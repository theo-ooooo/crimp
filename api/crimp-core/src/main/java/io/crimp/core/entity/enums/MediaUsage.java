package io.crimp.core.entity.enums;

public enum MediaUsage {
    ATTEMPT(1),
    AVATAR(2),
    POSTER(3);

    private final int code;

    MediaUsage(int code) {
        this.code = code;
    }

    public int code() {
        return code;
    }

    public static MediaUsage of(int code) {
        for (MediaUsage u : values()) {
            if (u.code == code) return u;
        }
        throw new IllegalArgumentException("Unknown MediaUsage code: " + code);
    }
}
