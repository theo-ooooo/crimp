ALTER TABLE profiles
  ADD COLUMN nickname_configured BOOLEAN NOT NULL DEFAULT FALSE AFTER nickname;

-- 기본 닉네임(crimper_{숫자})이 아닌 프로필은 이미 닉네임을 설정한 것으로 백필 (모달 회귀 방지)
UPDATE profiles
SET nickname_configured = TRUE
WHERE nickname NOT REGEXP '^crimper_[0-9]+$';
