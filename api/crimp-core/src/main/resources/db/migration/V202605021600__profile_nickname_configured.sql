ALTER TABLE profiles
  ADD COLUMN nickname_configured BOOLEAN NOT NULL DEFAULT FALSE AFTER nickname;
