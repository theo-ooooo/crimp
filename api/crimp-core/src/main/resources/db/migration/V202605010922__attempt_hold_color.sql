-- V202605010922: 시도 (session_attempts) 에 hold_color 컬럼 추가 + 기존 tags JSON 백필
-- (PR #93, F5 PR-4).
--
-- 기존에는 클라가 hold 색을 tags JSON 안에 `{"hold":"red"}` 로 실어 보냈으나, 검색·통계용으로
-- 1급 컬럼이 필요해 별도 분리. 본 PR 의 리뷰 S5 반영으로, 기존 row 도 같은 트랜잭션에서 즉시
-- 백필해 자동 게시 피드의 hold 점 가시화 회귀를 새 클라/구 row 모두에서 차단.

ALTER TABLE session_attempts
  ADD COLUMN hold_color VARCHAR(20) NULL COMMENT 'red/blue/yellow/green/white/black/pink/orange/purple/gray'
  AFTER tags;

-- 기존 row 의 tags 안 hold 키를 컬럼으로 백필. JSON_UNQUOTE 로 양쪽 따옴표 제거.
-- WHERE 가드: hold_color 가 이미 채워졌거나 tags 가 NULL/비어있으면 skip.
UPDATE session_attempts
   SET hold_color = JSON_UNQUOTE(JSON_EXTRACT(tags, '$.hold'))
 WHERE hold_color IS NULL
   AND tags IS NOT NULL
   AND JSON_EXTRACT(tags, '$.hold') IS NOT NULL;
