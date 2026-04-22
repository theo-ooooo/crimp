package io.crimp.domain.gym;

public class GymException extends RuntimeException {
    private final String code;

    public GymException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() { return code; }
}
