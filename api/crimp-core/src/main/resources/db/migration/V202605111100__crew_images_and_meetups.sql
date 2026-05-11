-- V202605111100: 크루 대표 이미지와 크루 모임

DELIMITER //

CREATE PROCEDURE crimp_apply_crew_images_and_meetups()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'crews'
      AND COLUMN_NAME = 'image_media_id'
  ) THEN
    ALTER TABLE crews
      ADD COLUMN image_media_id BIGINT UNSIGNED NULL AFTER home_gym_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'crews'
      AND INDEX_NAME = 'idx_crews_image_media'
  ) THEN
    ALTER TABLE crews
      ADD KEY idx_crews_image_media (image_media_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'crews'
      AND CONSTRAINT_NAME = 'fk_crews_image_media'
  ) THEN
    ALTER TABLE crews
      ADD CONSTRAINT fk_crews_image_media FOREIGN KEY (image_media_id) REFERENCES media_assets(id);
  END IF;
END//

CALL crimp_apply_crew_images_and_meetups()//

DROP PROCEDURE crimp_apply_crew_images_and_meetups//

DELIMITER ;

CREATE TABLE IF NOT EXISTS meetups (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ext_id      CHAR(26) NOT NULL,
  crew_id     BIGINT UNSIGNED NULL,
  created_by  BIGINT UNSIGNED NOT NULL,
  gym_id      BIGINT UNSIGNED NULL,
  title       VARCHAR(60) NOT NULL,
  description VARCHAR(500) NULL,
  starts_at   TIMESTAMP NOT NULL,
  ends_at     TIMESTAMP NULL,
  location    VARCHAR(100) NULL,
  capacity    SMALLINT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_meetups_ext_id (ext_id),
  KEY idx_meetups_starts (deleted_at, starts_at, id),
  KEY idx_meetups_crew_starts (crew_id, deleted_at, starts_at, id),
  KEY idx_meetups_creator (created_by),
  KEY idx_meetups_gym (gym_id),
  CONSTRAINT fk_meetups_crew FOREIGN KEY (crew_id) REFERENCES crews(id),
  CONSTRAINT fk_meetups_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_meetups_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
  CONSTRAINT chk_meetups_capacity CHECK (capacity IS NULL OR capacity BETWEEN 2 AND 200)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
