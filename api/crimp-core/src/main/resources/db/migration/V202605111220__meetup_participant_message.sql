-- V202605111220: 승인제 모임 참여 요청 메시지

DROP PROCEDURE IF EXISTS add_meetup_participant_message;

DELIMITER //
CREATE PROCEDURE add_meetup_participant_message()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'meetup_participants'
      AND COLUMN_NAME = 'message'
  ) THEN
    ALTER TABLE meetup_participants
      ADD COLUMN message VARCHAR(500) NULL AFTER status;
  END IF;
END //
DELIMITER ;

CALL add_meetup_participant_message();

DROP PROCEDURE IF EXISTS add_meetup_participant_message;
