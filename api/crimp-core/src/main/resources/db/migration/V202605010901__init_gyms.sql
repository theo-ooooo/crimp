-- V202605010901: 암장 / 루트 (설계서 §3.4, §3.5)

CREATE TABLE gyms (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ext_id             CHAR(26) NOT NULL,
  name               VARCHAR(100) NOT NULL,
  brand              VARCHAR(50) NULL COMMENT '더클라임 / 클라임웍스 등',
  address            VARCHAR(200) NOT NULL,
  lat                DECIMAL(10,7) NOT NULL,
  lng                DECIMAL(10,7) NOT NULL,
  phone              VARCHAR(20) NULL,
  opening_hours      JSON NULL,
  setting_cycle_days SMALLINT NULL COMMENT '세팅 주기(일)',
  features           JSON NULL COMMENT '{"bouldering":true,"lead":false,"moonboard":true}',
  status             TINYINT NOT NULL DEFAULT 1 COMMENT '1=ACTIVE, 9=CLOSED',
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_gyms_ext_id (ext_id),
  KEY idx_gyms_geo (lat, lng),
  KEY idx_gyms_brand (brand)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE routes (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ext_id              CHAR(26) NOT NULL,
  gym_id              BIGINT UNSIGNED NOT NULL,
  name                VARCHAR(100) NULL,
  color               VARCHAR(20) NULL COMMENT '암장 내부 색 표기',
  grade_scale         VARCHAR(20) NOT NULL COMMENT 'V / FONT / YDS',
  grade_value         VARCHAR(10) NOT NULL COMMENT 'V3 / 6C+ / 5.10a',
  grade_numeric       DECIMAL(4,1) NOT NULL COMMENT '비교용 정규화 난이도',
  setter              VARCHAR(50) NULL,
  set_at              DATE NULL,
  removed_at          DATE NULL,
  thumbnail_media_id  BIGINT UNSIGNED NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_routes_ext_id (ext_id),
  KEY idx_routes_gym_active (gym_id, removed_at),
  KEY idx_routes_grade (grade_numeric),
  CONSTRAINT fk_routes_gym FOREIGN KEY (gym_id) REFERENCES gyms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
