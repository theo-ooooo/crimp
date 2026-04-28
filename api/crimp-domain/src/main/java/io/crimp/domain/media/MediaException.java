package io.crimp.domain.media;

/** 미디어 도메인 예외 — 호출자가 {@link #code()} 로 분기. */
public class MediaException extends RuntimeException {

    private final String code;

    public MediaException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
