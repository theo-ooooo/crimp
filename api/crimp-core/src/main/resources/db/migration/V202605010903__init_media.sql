-- V202605010903: 미디어 자산 / 게시물-미디어 연결 (설계서 §3.9, §3.10)

CREATE TABLE media_assets (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ext_id             CHAR(26) NOT NULL,
  owner_user_id      BIGINT UNSIGNED NOT NULL,
  kind               TINYINT NOT NULL COMMENT '1=IMAGE 2=VIDEO',
  status             TINYINT NOT NULL DEFAULT 1 COMMENT '1=UPLOADING 2=PROCESSING 3=READY 9=FAILED',
  mime               VARCHAR(80) NOT NULL,
  byte_size          BIGINT UNSIGNED NULL,
  width              INT UNSIGNED NULL,
  height             INT UNSIGNED NULL,
  duration_ms        INT UNSIGNED NULL,
  s3_key             VARCHAR(500) NOT NULL,
  cdn_url            VARCHAR(500) NULL,
  thumbnail_cdn_url  VARCHAR(500) NULL,
  variants           JSON NULL COMMENT '[{"h":720,"url":"..."}, ...]',
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_media_ext_id (ext_id),
  KEY idx_media_owner (owner_user_id, created_at DESC),
  KEY idx_media_status (status, created_at),
  CONSTRAINT fk_media_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- session_attempts.media_id → media_assets.id (routes.thumbnail_media_id 도 동일)
ALTER TABLE session_attempts
  ADD CONSTRAINT fk_attempts_media FOREIGN KEY (media_id) REFERENCES media_assets(id);

ALTER TABLE routes
  ADD CONSTRAINT fk_routes_thumbnail FOREIGN KEY (thumbnail_media_id) REFERENCES media_assets(id);

ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_avatar FOREIGN KEY (avatar_media_id) REFERENCES media_assets(id);
