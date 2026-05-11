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
import lombok.Builder;
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

    @Column(name = "image_media_id")
    private Long imageMediaId;

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
    private Short capacity;

    @Column(name = "member_count", nullable = false)
    private Integer memberCount;

    @Builder
    private Crew(String extId, Long ownerUserId, Long homeGymId, Long imageMediaId, String name, String summary,
                 String description, String region, CrewLevelBand levelBand, CrewStyle style,
                 CrewVisibility visibility, CrewJoinPolicy joinPolicy, Short capacity,
                 Integer memberCount) {
        this.extId = extId;
        this.ownerUserId = ownerUserId;
        this.homeGymId = homeGymId;
        this.imageMediaId = imageMediaId;
        this.name = name;
        this.summary = summary;
        this.description = description;
        this.region = region;
        this.levelBand = levelBand == null ? CrewLevelBand.ALL : levelBand;
        this.style = style == null ? CrewStyle.BOULDERING : style;
        this.visibility = visibility == null ? CrewVisibility.PUBLIC : visibility;
        this.joinPolicy = joinPolicy == null ? CrewJoinPolicy.APPROVAL : joinPolicy;
        this.capacity = capacity;
        this.memberCount = memberCount == null ? 1 : memberCount;
    }

    public void updateBasic(String name, String summary, String description, String region,
                            Long homeGymId, Long imageMediaId, CrewLevelBand levelBand,
                            CrewStyle style, Short capacity) {
        this.name = name;
        this.summary = summary;
        this.description = description;
        this.region = region;
        this.homeGymId = homeGymId;
        this.imageMediaId = imageMediaId;
        this.levelBand = levelBand;
        this.style = style;
        this.capacity = capacity;
    }

    public boolean isCapacityFull() {
        return capacity != null && memberCount >= capacity;
    }

    public void incrementMemberCount() {
        this.memberCount = this.memberCount + 1;
    }

    public void decrementMemberCount() {
        if (this.memberCount > 0) {
            this.memberCount = this.memberCount - 1;
        }
    }
}
