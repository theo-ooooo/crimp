-- V202605081000: Phase 1.5 크루 개설/가입 기초

CREATE TABLE crews (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ext_id        CHAR(26) NOT NULL,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  home_gym_id   BIGINT UNSIGNED NULL,
  name          VARCHAR(30) NOT NULL,
  summary       VARCHAR(120) NULL,
  description   VARCHAR(500) NULL,
  region        VARCHAR(50) NULL,
  level_band    VARCHAR(20) NOT NULL DEFAULT 'ALL',
  style         VARCHAR(20) NOT NULL DEFAULT 'BOULDERING',
  visibility    VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
  join_policy   VARCHAR(20) NOT NULL DEFAULT 'APPROVAL',
  capacity      SMALLINT UNSIGNED NULL,
  member_count  INT UNSIGNED NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_crews_ext_id (ext_id),
  UNIQUE KEY uk_crews_name (name),
  KEY idx_crews_list (visibility, deleted_at, id DESC),
  KEY idx_crews_filters (region, level_band, style),
  KEY idx_crews_home_gym (home_gym_id),
  KEY idx_crews_owner (owner_user_id),
  CONSTRAINT fk_crews_owner FOREIGN KEY (owner_user_id) REFERENCES users(id),
  CONSTRAINT fk_crews_home_gym FOREIGN KEY (home_gym_id) REFERENCES gyms(id),
  CONSTRAINT chk_crews_capacity CHECK (capacity IS NULL OR capacity BETWEEN 2 AND 200)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crew_members (
  crew_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  role       VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
  status     VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  joined_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (crew_id, user_id),
  KEY idx_crew_members_user (user_id, status, joined_at DESC),
  KEY idx_crew_members_crew_role (crew_id, role, status),
  CONSTRAINT fk_crew_members_crew FOREIGN KEY (crew_id) REFERENCES crews(id),
  CONSTRAINT fk_crew_members_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crew_join_requests (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ext_id        CHAR(26) NOT NULL,
  crew_id       BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  message       VARCHAR(500) NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  decided_by    BIGINT UNSIGNED NULL,
  decided_at    TIMESTAMP NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_crew_join_requests_ext_id (ext_id),
  KEY idx_crew_join_requests_crew_status (crew_id, status, created_at DESC),
  KEY idx_crew_join_requests_user_status (user_id, status, created_at DESC),
  CONSTRAINT fk_crew_join_requests_crew FOREIGN KEY (crew_id) REFERENCES crews(id),
  CONSTRAINT fk_crew_join_requests_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_crew_join_requests_decider FOREIGN KEY (decided_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
