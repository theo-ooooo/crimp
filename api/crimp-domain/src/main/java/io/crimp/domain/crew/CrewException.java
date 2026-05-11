package io.crimp.domain.crew;

public class CrewException extends RuntimeException {
    private final String code;

    public CrewException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
