package io.crimp.core.repository.crew;

import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewStyle;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.util.Optional;

public interface CrewRepositoryCustom {
    Slice<CrewSearchRow> searchPublic(Long cursorId, String keyword, String region, String gymExtId,
                                      CrewLevelBand levelBand, CrewStyle style, Long viewerUserId,
                                      Pageable pageable);

    Optional<CrewSearchRow> findPublicDetail(String extId, Long viewerUserId);
}
