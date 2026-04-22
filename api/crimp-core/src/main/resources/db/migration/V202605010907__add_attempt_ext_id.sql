-- V202605010907: session_attempts 에 외부 노출 ID(ext_id) 추가
--
-- MVP 초기에는 attempts 에 ext_id 를 두지 않았으나, API 경로 (/api/v1/attempts/{extId}) 가
-- 프로젝트의 \"외부는 ext_id, 내부는 bigint\" 컨벤션을 따르도록 컬럼 추가.
-- 기존 row 0 건이 전제 (prod 미오픈). 있어도 id 기반 자동 백필로 안전.

ALTER TABLE session_attempts
    ADD COLUMN ext_id CHAR(26) NULL AFTER id;

UPDATE session_attempts
   SET ext_id = CONCAT('ATT', LPAD(CAST(id AS CHAR), 23, '0'))
 WHERE ext_id IS NULL;

ALTER TABLE session_attempts
    MODIFY COLUMN ext_id CHAR(26) NOT NULL,
    ADD UNIQUE KEY uk_attempts_ext_id (ext_id);
