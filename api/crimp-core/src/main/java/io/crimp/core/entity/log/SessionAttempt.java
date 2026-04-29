package io.crimp.core.entity.log;

import io.crimp.core.entity.enums.AttemptResult;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "session_attempts")
@NoArgsConstructor(access = PROTECTED)
public class SessionAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, columnDefinition = "char(26)", unique = true, updatable = false)
    private String extId;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "route_id")
    private Long routeId;

    @Column(name = "gym_id")
    private Long gymId;

    @Column(name = "grade_value", length = 10)
    private String gradeValue;

    @Column(name = "grade_numeric", precision = 4, scale = 1)
    private BigDecimal gradeNumeric;

    @Column(name = "result", nullable = false)
    private AttemptResult result;

    @Column(name = "attempts", nullable = false)
    private Short attempts;

    @Column(name = "media_id")
    private Long mediaId;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "tags", columnDefinition = "json")
    private String tagsJson;

    /** 홀드 색 (PR #93, F5 PR-4) — 클라가 LogAttempt 시 함께 보내는 1급 컬럼. */
    @Column(name = "hold_color", length = 20)
    private String holdColor;

    @Column(name = "logged_at", nullable = false)
    private Instant loggedAt;

    public static final int MAX_ATTEMPTS = 999;

    private SessionAttempt(String extId, Long sessionId, Long routeId, AttemptResult result, int attempts, Instant loggedAt) {
        this.extId = extId;
        this.sessionId = sessionId;
        this.routeId = routeId;
        this.result = result;
        this.attempts = toAttemptShort(attempts);
        this.loggedAt = loggedAt;
    }

    public static SessionAttempt log(String extId, Long sessionId, Long routeId, AttemptResult result, int attempts, Instant loggedAt) {
        return new SessionAttempt(extId, sessionId, routeId, result, attempts, loggedAt);
    }

    public void updateRoute(Long routeId) { this.routeId = routeId; }
    public void updateGymId(Long gymId) { this.gymId = gymId; }
    public void updateGradeValue(String gradeValue) { this.gradeValue = gradeValue; }
    public void updateGradeNumeric(java.math.BigDecimal gradeNumeric) { this.gradeNumeric = gradeNumeric; }
    public void updateResult(AttemptResult result) { this.result = result; }
    public void updateAttempts(int attempts) { this.attempts = toAttemptShort(attempts); }
    public void updateMediaId(Long mediaId) { this.mediaId = mediaId; }
    public void updateNote(String note) { this.note = note; }
    public void updateTagsJson(String tagsJson) { this.tagsJson = tagsJson; }
    public void updateHoldColor(String holdColor) { this.holdColor = holdColor; }

    private static short toAttemptShort(int attempts) {
        if (attempts < 1 || attempts > MAX_ATTEMPTS) {
            throw new IllegalArgumentException("attempts must be between 1 and " + MAX_ATTEMPTS + " (got " + attempts + ")");
        }
        return (short) attempts;
    }
}
