-- meetups.is_outdoor: 아웃도어 여부를 명시적 컬럼으로 관리 (LIKE 쿼리 제거)
ALTER TABLE meetups ADD COLUMN is_outdoor TINYINT(1) NOT NULL DEFAULT 0 AFTER location;
CREATE INDEX idx_meetups_is_outdoor ON meetups (is_outdoor);
