package io.crimp.core.entity.crew;

import io.crimp.core.base.SoftDeletableEntity;
import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.core.entity.enums.CrewVisibility;
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

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "crews")
@NoArgsConstructor(access = PROTECTED)
public class Crew extends SoftDeletableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, columnDefinition = "char(26)", unique = true, updatable = false)
    private String extId;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(name = "home_gym_id")
    private Long homeGymId;

    @Column(name = "name", nullable = false, length = 30)
    private String name;

    @Column(name = "summary", length = 120)
    private String summary;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "region", length = 50)
    private String region;

    @Enumerated(EnumType.STRING)
    @Column(name = "level_band", nullable = false, length = 20)
    private CrewLevelBand levelBand;

    @Enumerated(EnumType.STRING)
    @Column(name = "style", nullable = false, length = 20)
    private CrewStyle style;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 20)
    private CrewVisibility visibility;

    @Enumerated(EnumType.STRING)
    @Column(name = "join_policy", nullable = false, length = 20)
    private CrewJoinPolicy joinPolicy;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "member_count", nullable = false)
    private Integer memberCount;

    private Crew(String extId, Long ownerUserId, Long homeGymId, String name, String summary,
                 String description, String region, CrewLevelBand levelBand, CrewStyle style,
                 Integer capacity) {
        this.extId = extId;
        this.ownerUserId = ownerUserId;
        this.homeGymId = homeGymId;
        this.name = name;
        this.summary = summary;
        this.description = description;
        this.region = region;
        this.levelBand = levelBand == null ? CrewLevelBand.ALL : levelBand;
        this.style = style == null ? CrewStyle.BOULDERING : style;
        this.visibility = CrewVisibility.PUBLIC;
        this.joinPolicy = CrewJoinPolicy.APPROVAL;
        this.capacity = capacity;
        this.memberCount = 1;
    }

    public static Crew createPublicApproval(String extId, Long ownerUserId, Long homeGymId,
                                            String name, String summary, String description,
                                            String region, CrewLevelBand levelBand,
                                            CrewStyle style, Integer capacity) {
        return new Crew(extId, ownerUserId, homeGymId, name, summary, description, region,
                levelBand, style, capacity);
    }
}
