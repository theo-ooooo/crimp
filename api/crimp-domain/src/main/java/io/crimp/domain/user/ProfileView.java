package io.crimp.domain.user;

/**
 * 유저 + 프로필 합성 뷰 DTO. API 응답용 원시 소스.
 * nickname 은 Profile 에 유일하게 존재하므로 nullable 로 두지 않고 항상 세팅.
 */
public record ProfileView(
        String extId,
        String nickname,
        String bio,
        Long avatarMediaId,
        Byte levelSelf,
        Long mainGymId
) {}
