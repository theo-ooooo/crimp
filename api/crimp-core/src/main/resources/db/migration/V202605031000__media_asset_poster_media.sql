-- VIDEO 행에 사용자 지정 대표 썸네일(IMAGE media_assets.id) 연결 — 피드 thumbnailUrl 합성용

ALTER TABLE media_assets
  ADD COLUMN poster_media_id BIGINT UNSIGNED NULL
    COMMENT 'VIDEO 전용: 대표 화면으로 올린 IMAGE 미디어 id'
    AFTER duration_ms;

ALTER TABLE media_assets
  ADD CONSTRAINT fk_media_asset_poster_media
    FOREIGN KEY (poster_media_id) REFERENCES media_assets(id)
    ON DELETE SET NULL;
