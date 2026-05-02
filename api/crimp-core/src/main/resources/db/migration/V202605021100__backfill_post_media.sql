-- V202605021100: 자동 게시된 feed_post 중 post_media 가 비어있는 행을 attempt.media_id 기반으로 backfill.
--
-- 배경: AttemptService.autoPublishToFeed 가 feed_post 만 만들고 post_media INSERT 가 빠져 있어
-- 피드 응답의 mediaUrls 가 항상 빈 배열로 떨어지는 회귀가 staging 에서 확인됨. 코드 fix 와
-- 함께, 그 회귀가 누적된 동안 만들어진 기존 게시물도 같이 살린다.
--
-- 안전성:
--  - WHERE 절: attempt.media_id 가 NOT NULL + feed_post 가 살아있고(=deleted_at IS NULL) +
--    아직 동일 (post_id, media_id) 쌍이 post_media 에 없을 때만 INSERT.
--  - seq=0 고정 — attempt 는 1:1 media_id 만 들고 있어 다중 미디어 시나리오 부재.
--  - media_assets.status 가 READY 가 아닌 행도 일단 link 만 생성 — 피드 쿼리는 status=READY
--    필터를 자체적으로 갖고 있어 응답엔 안 흘러간다 (FeedPostRepositoryCustomImpl).
INSERT INTO post_media (post_id, media_id, seq)
SELECT fp.id, a.media_id, 0
FROM feed_posts fp
  JOIN session_attempts a ON fp.attempt_id = a.id
WHERE a.media_id IS NOT NULL
  AND fp.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM post_media pm
    WHERE pm.post_id = fp.id AND pm.media_id = a.media_id
  );
