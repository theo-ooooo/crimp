-- V202605031100: media_assets.poster_media_id 자기참조 방지 CHECK 추가.
--
-- 도메인 가드 (MediaService.completeUpload 의 attachAsPosterForVideoId == mediaId 거부) 가
-- 이미 있지만 ad-hoc SQL / 미래 batch 등 다른 경로에서 자기참조가 들어올 수 있어 DB 레벨 1선
-- 추가. MySQL 8.0.16+ 가 CHECK 제약을 정상 enforcement.
ALTER TABLE media_assets
  ADD CONSTRAINT chk_media_poster_no_self
    CHECK (poster_media_id IS NULL OR poster_media_id <> id);
