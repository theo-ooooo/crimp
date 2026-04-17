package io.crimp.core.entity.enums;

public enum MediaKind {
    IMAGE(1),
    VIDEO(2);

    private final int code;

    MediaKind(int code) {
        this.code = code;
    }

    public int code() {
        return code;
    }

    public static MediaKind of(int code) {
        for (MediaKind k : values()) {
            if (k.code == code) return k;
        }
        throw new IllegalArgumentException("Unknown MediaKind code: " + code);
    }
}
