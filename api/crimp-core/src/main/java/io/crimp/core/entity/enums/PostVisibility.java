package io.crimp.core.entity.enums;

public enum PostVisibility {
    PUBLIC(1),
    FOLLOWERS(2),
    PRIVATE(3);

    private final int code;

    PostVisibility(int code) {
        this.code = code;
    }

    public int code() {
        return code;
    }

    public static PostVisibility of(int code) {
        for (PostVisibility v : values()) {
            if (v.code == code) return v;
        }
        throw new IllegalArgumentException("Unknown PostVisibility code: " + code);
    }
}
