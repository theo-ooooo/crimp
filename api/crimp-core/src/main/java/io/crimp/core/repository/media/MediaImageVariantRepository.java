package io.crimp.core.repository.media;

import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.core.entity.media.MediaImageVariant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MediaImageVariantRepository extends JpaRepository<MediaImageVariant, Long> {
    Optional<MediaImageVariant> findFirstByMediaIdAndStatusAndPrimaryTrueOrderByIdDesc(Long mediaId, MediaStatus status);
}
