-- V202605010922: 시도 (session_attempts) 에 hold_color 컬럼 추가 (PR #93, F5 PR-4).
--
-- 기존에는 클라가 hold 색을 tags JSON 안에 `{"hold":"red"}` 로 실어 보냈으나, 검색·통계용으로
-- 1급 컬럼이 필요해 별도 분리. 기존 row 의 tags 값은 본 마이그레이션에서 백필하지 않는다 —
-- Phase 1 MVP 의 attempt 데이터량이 적고, 새 클라가 컬럼을 채우기 시작하면 자연스럽게 수렴.
-- (필요 시 후속 PR 로 백필 스크립트 추가 가능.)

ALTER TABLE session_attempts
  ADD COLUMN hold_color VARCHAR(20) NULL COMMENT 'red/blue/yellow/green/white/black/pink/orange/purple/gray'
  AFTER tags;
