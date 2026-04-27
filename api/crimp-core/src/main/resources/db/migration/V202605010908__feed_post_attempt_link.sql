-- V202605010908: feed_posts 와 session_attempts 의 1:1 링크
--
-- V904 초기 스키마에는 attempt_id 컬럼이 없었다. 시도 기록 시 자동 게시(SEND/FLASH/ONSIGHT)
-- 정책을 도입하면서, 동일 시도가 두 번 게시되지 않도록 1:1 무결성을 DB 레벨에서 강제할 필요가
-- 생겼다. V904 는 이미 develop 머지된 상태라 백포트하지 않고 별도 마이그레이션으로 추가한다.
--
-- 멱등성 보강: 애플리케이션 레벨에서도 attempt_id 로 조회 후 skip 하지만, 동시성/재시도/직접
-- INSERT 방어를 위해 DB UNIQUE 제약을 추가한다. NULL 허용 — 시도와 무관한 게시(추후 자유 글
-- 작성 등) 도 같은 테이블을 공유하기 위함. NULL 다중 허용은 MySQL UNIQUE 의 자연 동작.

ALTER TABLE feed_posts
    ADD COLUMN attempt_id BIGINT UNSIGNED NULL AFTER session_id,
    ADD UNIQUE KEY uk_posts_attempt (attempt_id),
    ADD CONSTRAINT fk_posts_attempt FOREIGN KEY (attempt_id) REFERENCES session_attempts(id);
