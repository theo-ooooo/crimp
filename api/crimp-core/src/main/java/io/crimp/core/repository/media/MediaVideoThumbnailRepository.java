package io.crimp.core.repository.media;

import io.crimp.core.entity.media.MediaVideoThumbnail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MediaVideoThumbnailRepository extends JpaRepository<MediaVideoThumbnail, Long> {
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update MediaVideoThumbnail t set t.primary = false where t.videoMediaId = :videoMediaId and t.primary = true")
    int clearPrimaryByVideoMediaId(@Param("videoMediaId") Long videoMediaId);
}
