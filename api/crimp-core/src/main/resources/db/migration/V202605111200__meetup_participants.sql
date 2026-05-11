-- V202605111200: 모임 참여자

CREATE TABLE IF NOT EXISTS meetup_participants (
  meetup_id  BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  joined_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (meetup_id, user_id),
  KEY idx_meetup_participants_user (user_id, status, joined_at DESC),
  KEY idx_meetup_participants_meetup_status (meetup_id, status),
  CONSTRAINT fk_meetup_participants_meetup FOREIGN KEY (meetup_id) REFERENCES meetups(id),
  CONSTRAINT fk_meetup_participants_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
