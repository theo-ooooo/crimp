package io.crimp.domain.user;

/**
 * PATCH /v1/me/profile 용 커맨드.
 * null 필드는 "변경하지 않음" 을 의미.
 */
public record UpdateProfileCommand(
        String nickname,
        String bio,
        Byte levelSelf,
        Long mainGymId,
        Long avatarMediaId
) {}
