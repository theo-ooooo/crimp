-- V202605041000: 암장 통계 스냅샷 (Phase 1.5)

CREATE TABLE gym_stats (
  gym_id             BIGINT UNSIGNED NOT NULL,
  rating             DECIMAL(2,1) NULL COMMENT '리뷰 도메인 전까지 null',
  send_count         BIGINT UNSIGNED NOT NULL DEFAULT 0,
  monthly_user_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (gym_id),
  CONSTRAINT fk_gym_stats_gym FOREIGN KEY (gym_id) REFERENCES gyms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO gym_stats (gym_id)
SELECT id
FROM gyms;
