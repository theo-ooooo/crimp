package io.crimp.core.entity.gym;

import io.crimp.core.entity.enums.GradeScale;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "routes")
@NoArgsConstructor(access = PROTECTED)
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, length = 26, unique = true, updatable = false)
    private String extId;

    @Column(name = "gym_id", nullable = false)
    private Long gymId;

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "color", length = 20)
    private String color;

    @Enumerated(EnumType.STRING)
    @Column(name = "grade_scale", nullable = false, length = 20)
    private GradeScale gradeScale;

    @Column(name = "grade_value", nullable = false, length = 10)
    private String gradeValue;

    @Column(name = "grade_numeric", nullable = false, precision = 4, scale = 1)
    private BigDecimal gradeNumeric;

    @Column(name = "setter", length = 50)
    private String setter;

    @Column(name = "set_at")
    private LocalDate setAt;

    @Column(name = "removed_at")
    private LocalDate removedAt;

    @Column(name = "thumbnail_media_id")
    private Long thumbnailMediaId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public boolean isActive() {
        return removedAt == null;
    }
}
