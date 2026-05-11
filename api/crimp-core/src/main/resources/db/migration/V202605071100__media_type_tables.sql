-- V202605071100: 타입별 미디어 확장 테이블 분리
-- media_assets 의 original_path/webp_path 전환은 V202605061930 에서 이미 적용되었다.
-- 이 마이그레이션은 이미지/비디오 전용 메타와 파생 파일 테이블만 추가한다.

CREATE TABLE media_images (
  media_id BIGINT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  PRIMARY KEY (media_id),
  CONSTRAINT fk_media_images_asset
    FOREIGN KEY (media_id) REFERENCES media_assets(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE media_image_variants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  media_id BIGINT UNSIGNED NOT NULL,
  variant_type TINYINT NOT NULL COMMENT '1=WEBP 2=AVIF 3=THUMBNAIL',
  status TINYINT NOT NULL DEFAULT 2 COMMENT '2=PROCESSING 3=READY 9=FAILED',
  mime VARCHAR(80) NOT NULL,
  byte_size BIGINT UNSIGNED NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  path VARCHAR(500) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_media_image_variants_media (media_id, status, is_primary),
  CONSTRAINT fk_media_image_variants_image
    FOREIGN KEY (media_id) REFERENCES media_images(media_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE media_videos (
  media_id BIGINT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  duration_ms INT UNSIGNED NULL,
  PRIMARY KEY (media_id),
  CONSTRAINT fk_media_videos_asset
    FOREIGN KEY (media_id) REFERENCES media_assets(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE media_video_variants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  media_id BIGINT UNSIGNED NOT NULL,
  variant_type TINYINT NOT NULL COMMENT '1=COMPRESSED_MP4 2=HLS',
  status TINYINT NOT NULL DEFAULT 2 COMMENT '2=PROCESSING 3=READY 9=FAILED',
  mime VARCHAR(80) NOT NULL,
  byte_size BIGINT UNSIGNED NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  duration_ms INT UNSIGNED NULL,
  path VARCHAR(500) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_media_video_variants_media (media_id, status, is_primary),
  CONSTRAINT fk_media_video_variants_video
    FOREIGN KEY (media_id) REFERENCES media_videos(media_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE media_video_thumbnails (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  video_media_id BIGINT UNSIGNED NOT NULL,
  image_media_id BIGINT UNSIGNED NULL,
  path VARCHAR(500) NULL,
  mime VARCHAR(80) NULL,
  byte_size BIGINT UNSIGNED NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  source_type TINYINT NOT NULL COMMENT '1=GENERATED 2=USER_SELECTED',
  status TINYINT NOT NULL DEFAULT 2 COMMENT '2=PROCESSING 3=READY 9=FAILED',
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_media_video_thumbnails_video (video_media_id, status, is_primary),
  KEY idx_media_video_thumbnails_image (image_media_id),
  CONSTRAINT fk_media_video_thumbnails_video
    FOREIGN KEY (video_media_id) REFERENCES media_videos(media_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_media_video_thumbnails_image
    FOREIGN KEY (image_media_id) REFERENCES media_images(media_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO media_images (media_id, width, height)
SELECT id, width, height
FROM media_assets
WHERE kind = 1
  AND status = 3;

INSERT INTO media_videos (media_id, width, height, duration_ms)
SELECT id, width, height, duration_ms
FROM media_assets
WHERE kind = 2
  AND status = 3;

INSERT INTO media_video_thumbnails (
  video_media_id, image_media_id, source_type, status, is_primary
)
SELECT id, poster_media_id, 2, 3, TRUE
FROM media_assets m
JOIN media_images i ON i.media_id = m.poster_media_id
WHERE m.kind = 2
  AND m.status = 3
  AND m.poster_media_id IS NOT NULL;
