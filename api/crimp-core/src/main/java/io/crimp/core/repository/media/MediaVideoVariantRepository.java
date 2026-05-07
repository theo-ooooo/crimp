package io.crimp.core.repository.media;

import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.core.entity.media.MediaVideoVariant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MediaVideoVariantRepository extends JpaRepository<MediaVideoVariant, Long> {
    Optional<MediaVideoVariant> findFirstByMediaIdAndStatusAndPrimaryTrueOrderByIdDesc(Long mediaId, MediaStatus status);
}
