-- V202605010902: 등반 세션 / 시도 (설계서 §3.6, §3.7)

CREATE TABLE climbing_sessions (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ext_id       CHAR(26) NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  gym_id       BIGINT UNSIGNED NULL COMMENT '자연 암장은 NULL',
  gym_name_raw VARCHAR(100) NULL COMMENT '외부/자연 암장일 때 수기 입력값',
  started_at   TIMESTAMP NOT NULL,
  ended_at     TIMESTAMP NULL,
  duration_min SMALLINT NULL,
  note         VARCHAR(500) NULL,
  `condition`  TINYINT NULL COMMENT '1~5 컨디션 자가 평가',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_sessions_ext_id (ext_id),
  KEY idx_sessions_user_time (user_id, started_at DESC),
  KEY idx_sessions_gym_time (gym_id, started_at DESC),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_sessions_gym FOREIGN KEY (gym_id) REFERENCES gyms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE session_attempts (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id     BIGINT UNSIGNED NOT NULL,
  route_id       BIGINT UNSIGNED NULL,
  gym_id         BIGINT UNSIGNED NULL COMMENT '조회 최적화용 비정규화',
  grade_value    VARCHAR(10) NULL COMMENT 'route 없을 때 수기 입력',
  grade_numeric  DECIMAL(4,1) NULL,
  result         TINYINT NOT NULL COMMENT '1=SEND 2=FLASH 3=ONSIGHT 4=TRY 5=FAIL',
  attempts       SMALLINT NOT NULL DEFAULT 1,
  media_id       BIGINT UNSIGNED NULL,
  note           VARCHAR(300) NULL,
  tags           JSON NULL COMMENT "['crimp','slab','overhang']",
  logged_at      TIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  KEY idx_attempts_session (session_id),
  KEY idx_attempts_route (route_id),
  KEY idx_attempts_gym_time (gym_id, logged_at DESC),
  CONSTRAINT fk_attempts_session FOREIGN KEY (session_id) REFERENCES climbing_sessions(id),
  CONSTRAINT fk_attempts_route FOREIGN KEY (route_id) REFERENCES routes(id),
  CONSTRAINT fk_attempts_gym FOREIGN KEY (gym_id) REFERENCES gyms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
