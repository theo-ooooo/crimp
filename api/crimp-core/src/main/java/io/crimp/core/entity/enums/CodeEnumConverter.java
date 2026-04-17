package io.crimp.core.entity.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** TINYINT ↔ enum 변환. 각 enum 별로 상속해서 특화. */
public abstract class CodeEnumConverter<E extends Enum<E>> implements AttributeConverter<E, Integer> {

    private final Class<E> enumType;

    protected CodeEnumConverter(Class<E> enumType) {
        this.enumType = enumType;
    }

    @Override
    public Integer convertToDatabaseColumn(E attribute) {
        if (attribute == null) return null;
        return codeOf(attribute);
    }

    @Override
    public E convertToEntityAttribute(Integer dbData) {
        if (dbData == null) return null;
        for (E c : enumType.getEnumConstants()) {
            if (codeOf(c) == dbData) return c;
        }
        throw new IllegalArgumentException("Unknown " + enumType.getSimpleName() + " code: " + dbData);
    }

    private int codeOf(E e) {
        try {
            return (int) e.getClass().getMethod("code").invoke(e);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Enum " + enumType.getSimpleName() + " must define `int code()`", ex);
        }
    }

    @Converter(autoApply = true)
    public static final class ForUserStatus extends CodeEnumConverter<UserStatus> {
        public ForUserStatus() { super(UserStatus.class); }
    }

    @Converter(autoApply = true)
    public static final class ForGymStatus extends CodeEnumConverter<GymStatus> {
        public ForGymStatus() { super(GymStatus.class); }
    }

    @Converter(autoApply = true)
    public static final class ForAttemptResult extends CodeEnumConverter<AttemptResult> {
        public ForAttemptResult() { super(AttemptResult.class); }
    }

    @Converter(autoApply = true)
    public static final class ForMediaKind extends CodeEnumConverter<MediaKind> {
        public ForMediaKind() { super(MediaKind.class); }
    }

    @Converter(autoApply = true)
    public static final class ForMediaStatus extends CodeEnumConverter<MediaStatus> {
        public ForMediaStatus() { super(MediaStatus.class); }
    }

    @Converter(autoApply = true)
    public static final class ForPostVisibility extends CodeEnumConverter<PostVisibility> {
        public ForPostVisibility() { super(PostVisibility.class); }
    }
}
