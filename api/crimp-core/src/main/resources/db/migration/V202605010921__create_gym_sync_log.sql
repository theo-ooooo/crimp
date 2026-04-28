-- V202605010921: 암장 동기화 감사 로그 (PR #87, Phase 1.5)
-- GymSyncService.apply 결과를 영구 기록 — diff 입력(예정 삽입/갱신) vs 실제 적용(inserted/updated)
-- 어긋남이 발생한 경우 사후 추적 가능 (PR #84/#85 회귀 운영 가시성).

CREATE TABLE gym_sync_log (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  occurred_at        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'apply 호출 시각',
  status             VARCHAR(30) NOT NULL COMMENT 'APPLIED / ABORTED_RATIO_GUARD / FAILED',
  lat                DECIMAL(10,7) NOT NULL COMMENT '동기화 대상 영역 중심 위도',
  lng                DECIMAL(10,7) NOT NULL COMMENT '동기화 대상 영역 중심 경도',
  radius_m           INT NOT NULL COMMENT '동기화 반경(미터)',
  -- diff 입력 (dryRun 결과)
  remote_count       INT NOT NULL DEFAULT 0 COMMENT '외부 소스가 가져온 매장 수',
  current_count      INT NOT NULL DEFAULT 0 COMMENT 'apply 시작 시점 DB 의 매장 수',
  additions_planned  INT NOT NULL DEFAULT 0 COMMENT 'diff 가 신규로 분류한 수',
  updates_planned    INT NOT NULL DEFAULT 0 COMMENT 'diff 가 변경으로 분류한 수',
  missing_count      INT NOT NULL DEFAULT 0 COMMENT '외부에서 안 보인 DB 매장 수 (폐업 후보)',
  -- apply 결과 (실제 적용)
  inserted           INT NOT NULL DEFAULT 0,
  updated            INT NOT NULL DEFAULT 0,
  update_skipped     INT NOT NULL DEFAULT 0 COMMENT 'findById empty 로 스킵된 update 수',
  error_message      VARCHAR(500) NULL,
  PRIMARY KEY (id),
  KEY idx_gym_sync_log_occurred (occurred_at),
  -- "최근 ABORTED/FAILED 만 보기" 류 운영 쿼리 대비 (PR #87 리뷰 I3).
  KEY idx_gym_sync_log_status_occurred (status, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
