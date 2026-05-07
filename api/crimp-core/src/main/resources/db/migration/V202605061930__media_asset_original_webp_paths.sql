-- V202605061930: media_assets 저장 경로 명확화
-- s3_key 는 실제 의미가 원본 object path 이므로 original_path 로 rename.
-- 대표 WebP 파생본은 단일 webp_path 컬럼으로 관리하고, 사용하지 않던 variants JSON 은 제거한다.

ALTER TABLE media_assets
  CHANGE COLUMN s3_key original_path VARCHAR(500) NOT NULL,
  ADD COLUMN webp_path VARCHAR(500) NULL AFTER original_path,
  DROP COLUMN variants;
