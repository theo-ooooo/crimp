package io.crimp.core.repository.media;

import io.crimp.core.entity.media.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {
    Optional<MediaAsset> findByExtId(String extId);
}
