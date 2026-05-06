package io.crimp.core.entity.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * MySQL TINYINT ↔ enum code 변환.
 * DB 컬럼이 TINYINT 이므로 Java 바인딩 타입은 Byte 로 선언.
 */
public abstract class CodeEnumConverter<E extends Enum<E>> implements AttributeConverter<E, Byte> {

    private final Class<E> enumType;

    protected CodeEnumConverter(Class<E> enumType) {
        this.enumType = enumType;
    }

    @Override
    public Byte convertToDatabaseColumn(E attribute) {
        if (attribute == null) return null;
        return (byte) codeOf(attribute);
    }

    @Override
    public E convertToEntityAttribute(Byte dbData) {
        if (dbData == null) return null;
        int code = dbData.intValue();
        for (E c : enumType.getEnumConstants()) {
            if (codeOf(c) == code) return c;
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
    public static final class ForMediaUsage extends CodeEnumConverter<MediaUsage> {
        public ForMediaUsage() { super(MediaUsage.class); }
    }

    @Converter(autoApply = true)
    public static final class ForPostVisibility extends CodeEnumConverter<PostVisibility> {
        public ForPostVisibility() { super(PostVisibility.class); }
    }
}
