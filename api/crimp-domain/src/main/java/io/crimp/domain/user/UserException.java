package io.crimp.domain.user;

public class UserException extends RuntimeException {
    private final String code;

    public UserException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() { return code; }
}
