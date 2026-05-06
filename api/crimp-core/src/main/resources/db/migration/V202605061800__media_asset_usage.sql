-- V202605061800: media_assets 용도 구분
-- 기존 업로드는 시도 기록/피드 첨부 경로였으므로 ATTEMPT(1) 로 백필한다.

ALTER TABLE media_assets
  ADD COLUMN usage_type TINYINT NOT NULL DEFAULT 1 COMMENT '1=ATTEMPT 2=AVATAR 3=POSTER' AFTER status;
