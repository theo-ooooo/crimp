package io.crimp.core.entity.enums;

public enum MediaStatus {
    UPLOADING(1),
    PROCESSING(2),
    READY(3),
    FAILED(9);

    private final int code;

    MediaStatus(int code) {
        this.code = code;
    }

    public int code() {
        return code;
    }

    public static MediaStatus of(int code) {
        for (MediaStatus s : values()) {
            if (s.code == code) return s;
        }
        throw new IllegalArgumentException("Unknown MediaStatus code: " + code);
    }
}
