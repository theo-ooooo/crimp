package io.crimp.core.entity.crew;

import io.crimp.core.base.SoftDeletableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "meetups")
@NoArgsConstructor(access = PROTECTED)
public class CrewMeetup extends SoftDeletableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, columnDefinition = "char(26)", unique = true, updatable = false)
    private String extId;

    @Column(name = "crew_id")
    private Long crewId;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "gym_id")
    private Long gymId;

    @Column(name = "title", nullable = false, length = 60)
    private String title;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "capacity")
    private Short capacity;

    @Builder
    private CrewMeetup(String extId, Long crewId, Long createdBy, Long gymId, String title, String description,
                       Instant startsAt, Instant endsAt, String location, Short capacity) {
        this.extId = extId;
        this.crewId = crewId;
        this.createdBy = createdBy;
        this.gymId = gymId;
        this.title = title;
        this.description = description;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.location = location;
        this.capacity = capacity;
    }
}
