-- V202605031100: 세션 gym_id 를 시도/자동 게시 feed_post 에 backfill.
--
-- 배경: 세션에 gym_id 가 있어도 LogAttempt/PATCH Attempt 에서 gym_id 를 생략하면
-- session_attempts.gym_id 와 feed_posts.gym_id 가 NULL 로 남아 암장별 피드/통계 조회에서
-- 누락될 수 있었다. 애플리케이션 fallback fix 와 함께 기존 데이터를 보정한다.

UPDATE session_attempts a
  JOIN climbing_sessions s ON a.session_id = s.id
SET a.gym_id = s.gym_id
WHERE a.gym_id IS NULL
  AND s.gym_id IS NOT NULL;

UPDATE feed_posts fp
  JOIN session_attempts a ON fp.attempt_id = a.id
SET fp.gym_id = a.gym_id
WHERE fp.gym_id IS NULL
  AND a.gym_id IS NOT NULL;
