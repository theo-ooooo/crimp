-- V202605010900: 유저 / 소셜 연결 / 프로필 초기 스키마
-- 설계서 §3.1 ~ §3.3 참조

CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ext_id        CHAR(26) NOT NULL,
  email         VARBINARY(256) NULL COMMENT 'KMS encrypted',
  email_hash    CHAR(64) NULL COMMENT 'SHA-256 of lower(email) for lookup',
  status        TINYINT NOT NULL DEFAULT 1 COMMENT '1=ACTIVE, 2=SUSPENDED, 9=DELETED',
  role          VARCHAR(20) NOT NULL DEFAULT 'USER',
  last_login_at TIMESTAMP NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_ext_id (ext_id),
  UNIQUE KEY uk_users_email_hash (email_hash),
  KEY idx_users_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE oauth_identities (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  provider     VARCHAR(20) NOT NULL COMMENT 'KAKAO, APPLE, GOOGLE',
  provider_uid VARCHAR(255) NOT NULL,
  linked_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_oauth_provider_uid (provider, provider_uid),
  KEY idx_oauth_user (user_id),
  CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE profiles (
  user_id          BIGINT UNSIGNED NOT NULL,
  nickname         VARCHAR(30) NOT NULL,
  bio              VARCHAR(300) NULL,
  avatar_media_id  BIGINT UNSIGNED NULL,
  level_self       TINYINT UNSIGNED NULL COMMENT 'V0~V16 self-declared',
  main_gym_id      BIGINT UNSIGNED NULL,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_profiles_nickname (nickname),
  KEY idx_profiles_main_gym (main_gym_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
