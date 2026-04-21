package io.crimp.core.entity.enums;

public enum AttemptResult {
    SEND(1),
    FLASH(2),
    ONSIGHT(3),
    TRY(4),
    FAIL(5);

    private final int code;

    AttemptResult(int code) {
        this.code = code;
    }

    public int code() {
        return code;
    }

    public static AttemptResult of(int code) {
        for (AttemptResult r : values()) {
            if (r.code == code) return r;
        }
        throw new IllegalArgumentException("Unknown AttemptResult code: " + code);
    }
}
