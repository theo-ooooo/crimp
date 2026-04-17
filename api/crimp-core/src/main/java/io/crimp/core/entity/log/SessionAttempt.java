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
    private Integer attempts;

    @Column(name = "media_id")
    private Long mediaId;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "tags", columnDefinition = "json")
    private String tagsJson;

    @Column(name = "logged_at", nullable = false)
    private Instant loggedAt;

    private SessionAttempt(Long sessionId, Long routeId, AttemptResult result, int attempts, Instant loggedAt) {
        this.sessionId = sessionId;
        this.routeId = routeId;
        this.result = result;
        this.attempts = attempts;
        this.loggedAt = loggedAt;
    }

    public static SessionAttempt log(Long sessionId, Long routeId, AttemptResult result, int attempts, Instant loggedAt) {
        return new SessionAttempt(sessionId, routeId, result, attempts, loggedAt);
    }
}
