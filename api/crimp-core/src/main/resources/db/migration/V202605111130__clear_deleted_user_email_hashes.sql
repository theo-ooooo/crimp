-- V202605111130: 기존 탈퇴 회원의 이메일 식별자를 제거해 동일 이메일 재가입을 허용한다.

UPDATE users
SET email = NULL,
    email_hash = NULL
WHERE (status = 9 OR deleted_at IS NOT NULL)
  AND (email IS NOT NULL OR email_hash IS NOT NULL);
