package io.crimp.domain.user;

/**
 * 유저 + 프로필 합성 뷰 DTO. API 응답용 원시 소스.
 * nickname 은 Profile 에 유일하게 존재하므로 nullable 로 두지 않고 항상 세팅.
 *
 * <p>{@code mainGymId} 는 내부 numeric id (호환·기존 응답 유지),
 * {@code mainGym} 은 클라이언트가 즉시 렌더 가능한 해석된 lightweight 객체.
 * 둘 다 null 이거나 둘 다 set 인 형태로만 운용 (mainGym=null 이면 mainGymId 도 null).
 */
public record ProfileView(
        String extId,
        String nickname,
        boolean nicknameConfigured,
        String bio,
        Long avatarMediaId,
        String avatarUrl,
        Byte levelSelf,
        Long mainGymId,
        MainGymView mainGym
) {

    /**
     * 클라이언트 렌더링용 최소 암장 정보. {@code GymItem} 의 부분집합.
     */
    public record MainGymView(String extId, String name, String brand) {}
}
