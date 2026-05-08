-- V202605071150: media_assets 의 기존 경로를 타입별 primary variant 로 백필
-- V202605071200 에서 media_assets.webp_path 및 메타 컬럼을 제거하기 전에 실행되어야 한다.

SET @backfill_image_variants_sql = IF(
  (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'media_assets'
      AND COLUMN_NAME = 'webp_path'
  ) = 1,
  'INSERT INTO media_image_variants (
     media_id, variant_type, status, mime, byte_size, width, height, path, is_primary
   )
   SELECT m.id, 1, 3, ''image/webp'', m.byte_size, i.width, i.height, m.webp_path, TRUE
   FROM media_assets m
   JOIN media_images i ON i.media_id = m.id
   WHERE m.kind = 1
     AND m.status = 3
     AND m.webp_path IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM media_image_variants v
       WHERE v.media_id = m.id
         AND v.variant_type = 1
         AND v.is_primary = TRUE
     )',
  'SELECT 1'
);

PREPARE backfill_image_variants_stmt FROM @backfill_image_variants_sql;
EXECUTE backfill_image_variants_stmt;
DEALLOCATE PREPARE backfill_image_variants_stmt;

INSERT INTO media_video_variants (
  media_id, variant_type, status, mime, byte_size, width, height, duration_ms, path, is_primary
)
SELECT m.id, 1, 3, m.mime, m.byte_size, v.width, v.height, v.duration_ms, m.original_path, TRUE
FROM media_assets m
JOIN media_videos v ON v.media_id = m.id
WHERE m.kind = 2
  AND m.status = 3
  AND NOT EXISTS (
    SELECT 1
    FROM media_video_variants vv
    WHERE vv.media_id = m.id
      AND vv.variant_type = 1
      AND vv.is_primary = TRUE
  );
