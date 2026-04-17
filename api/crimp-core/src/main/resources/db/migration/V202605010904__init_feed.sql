-- V202605010904: 피드 게시물 / 게시물-미디어 / 좋아요 / 댓글 (설계서 §3.8, §3.10, §3.11, §3.12)

CREATE TABLE feed_posts (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ext_id        CHAR(26) NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  content       VARCHAR(2000) NULL,
  session_id    BIGINT UNSIGNED NULL,
  gym_id        BIGINT UNSIGNED NULL,
  visibility    TINYINT NOT NULL DEFAULT 1 COMMENT '1=PUBLIC 2=FOLLOWERS 3=PRIVATE',
  like_count    INT UNSIGNED NOT NULL DEFAULT 0,
  comment_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_posts_ext_id (ext_id),
  KEY idx_posts_user_time (user_id, created_at DESC),
  KEY idx_posts_visibility_time (visibility, created_at DESC),
  KEY idx_posts_gym_time (gym_id, created_at DESC),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_posts_session FOREIGN KEY (session_id) REFERENCES climbing_sessions(id),
  CONSTRAINT fk_posts_gym FOREIGN KEY (gym_id) REFERENCES gyms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE post_media (
  post_id  BIGINT UNSIGNED NOT NULL,
  media_id BIGINT UNSIGNED NOT NULL,
  seq      SMALLINT NOT NULL,
  PRIMARY KEY (post_id, media_id),
  KEY idx_post_media_post_seq (post_id, seq),
  KEY idx_post_media_media (media_id),
  CONSTRAINT fk_post_media_post FOREIGN KEY (post_id) REFERENCES feed_posts(id),
  CONSTRAINT fk_post_media_media FOREIGN KEY (media_id) REFERENCES media_assets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE likes (
  user_id    BIGINT UNSIGNED NOT NULL,
  post_id    BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  KEY idx_likes_post_time (post_id, created_at DESC),
  CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_likes_post FOREIGN KEY (post_id) REFERENCES feed_posts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE comments (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ext_id     CHAR(26) NOT NULL,
  post_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  parent_id  BIGINT UNSIGNED NULL,
  content    VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_comments_ext_id (ext_id),
  KEY idx_comments_post_time (post_id, created_at),
  KEY idx_comments_parent (parent_id),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES feed_posts(id),
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
