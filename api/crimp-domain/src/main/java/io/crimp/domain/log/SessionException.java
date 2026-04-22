package io.crimp.domain.log;

public class SessionException extends RuntimeException {
    private final String code;

    public SessionException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() { return code; }
}
