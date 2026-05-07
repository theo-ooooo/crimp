-- V202605071200: media_assets 를 공통 원본 자산 테이블로 정리
-- 이미지/비디오 전용 메타와 파생 파일은 V202605071100 의 타입별 테이블이 소유한다.

ALTER TABLE media_assets
  DROP FOREIGN KEY fk_media_asset_poster_media;

ALTER TABLE media_assets
  DROP COLUMN poster_media_id,
  DROP COLUMN width,
  DROP COLUMN height,
  DROP COLUMN duration_ms,
  DROP COLUMN webp_path;
