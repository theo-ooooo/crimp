package io.crimp.domain.user;

/**
 * PATCH /v1/me/profile 용 커맨드.
 *
 * <p>주 암장(mainGym) 변경 의미론:
 * <ul>
 *   <li>{@code mainGymExtId} (권장) — 외부 ULID. 서비스에서 numeric id 로 해석.
 *   <li>{@code mainGymId} (호환) — numeric id 직접 지정 (기존 클라이언트 호환).
 *   <li>{@code clearMainGym=true} — 명시적 해제 → mainGymId 를 null 로 설정.
 *   <li>모두 null/false 인 경우 — "변경하지 않음".
 * </ul>
 *
 * <p>서비스 단에서 {@code clearMainGym=true} 와 {@code mainGymExtId}/{@code mainGymId} 동시 set 은
 * 검증 에러로 거부한다.
 *
 * <p>아바타 변경:
 * <ul>
 *   <li>{@code avatarMediaId} — 본인 소유 READY IMAGE 미디어를 프로필 이미지로 연결.
 *   <li>{@code clearAvatar=true} — 프로필 이미지를 명시 해제.
 * </ul>
 *
 * <p>다른 평범한 필드(nickname/bio/levelSelf)는 null 이면 "변경하지 않음" 의미.
 */
public record UpdateProfileCommand(
        String nickname,
        String bio,
        Byte levelSelf,
        Long mainGymId,
        String mainGymExtId,
        boolean clearMainGym,
        boolean clearAvatar,
        Long avatarMediaId
) {
    public UpdateProfileCommand(
            String nickname,
            String bio,
            Byte levelSelf,
            Long mainGymId,
            String mainGymExtId,
            boolean clearMainGym,
            Long avatarMediaId) {
        this(nickname, bio, levelSelf, mainGymId, mainGymExtId, clearMainGym, false, avatarMediaId);
    }
}
