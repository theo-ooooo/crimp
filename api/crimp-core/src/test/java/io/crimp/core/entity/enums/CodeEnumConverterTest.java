package io.crimp.core.entity.enums;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CodeEnumConverterTest {

    @Test
    void userStatus_roundTrip() {
        var c = new CodeEnumConverter.ForUserStatus();
        for (UserStatus s : UserStatus.values()) {
            Byte db = c.convertToDatabaseColumn(s);
            assertThat(db).isEqualTo((byte) s.code());
            assertThat(c.convertToEntityAttribute(db)).isEqualTo(s);
        }
    }

    @Test
    void attemptResult_roundTrip() {
        var c = new CodeEnumConverter.ForAttemptResult();
        for (AttemptResult r : AttemptResult.values()) {
            Byte db = c.convertToDatabaseColumn(r);
            assertThat(db).isEqualTo((byte) r.code());
            assertThat(c.convertToEntityAttribute(db)).isEqualTo(r);
        }
    }

    @Test
    void mediaStatus_roundTrip() {
        var c = new CodeEnumConverter.ForMediaStatus();
        for (MediaStatus s : MediaStatus.values()) {
            assertThat(c.convertToEntityAttribute(c.convertToDatabaseColumn(s))).isEqualTo(s);
        }
    }

    @Test
    void null_bidirectional() {
        var c = new CodeEnumConverter.ForPostVisibility();
        assertThat(c.convertToDatabaseColumn(null)).isNull();
        assertThat(c.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void unknown_code_throws() {
        var c = new CodeEnumConverter.ForGymStatus();
        assertThatThrownBy(() -> c.convertToEntityAttribute((byte) 99))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("GymStatus");
    }
}
