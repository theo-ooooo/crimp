-- V202605021000: media_assets 의 cdn_url / thumbnail_cdn_url 컬럼 제거.
--
-- 배경: cdn_url 은 절대 URL 을 DB 에 저장하는 형태라 CDN 도메인 변경/환경 분기 시
-- 마이그레이션 또는 backfill 이 필요해진다. s3_key 만 1급으로 두고, 응답 시점에
-- 환경별 CDN base URL 을 합성하는 방식으로 단일화.
--
-- 영향:
--  - MediaService.completeUpload 가 더 이상 cdn_url 을 DB 에 쓰지 않음.
--  - FeedService 가 응답 합성 단계에서 cdn-base-url + s3_key 로 절대 URL 생성.
--  - thumbnail_cdn_url 은 Phase 1 에선 어차피 null — 트랜스코드 도입 시 thumbnail_s3_key
--    또는 variants JSON 으로 재도입 예정 (후속).
ALTER TABLE media_assets
  DROP COLUMN cdn_url,
  DROP COLUMN thumbnail_cdn_url;
