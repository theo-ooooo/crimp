package io.crimp.domain.feed;

/**
 * 피드 필터 모드.
 *
 * <ul>
 *   <li>{@link #POPULAR} — 글로벌 SEND/FLASH/ONSIGHT 시도 (좋아요 도메인 도입 전 임시 인기 정렬).</li>
 *   <li>{@link #MY_GYM} — 요청자 {@code Profile.mainGymId} 의 시도. mainGym 미설정 시 빈 결과.</li>
 *   <li>{@link #FRIENDS} — 요청자가 팔로잉 중인 사용자들의 시도.</li>
 * </ul>
 *
 * <p>쿼리스트링 파싱은 {@link #fromQuery(String)} 으로만 수행한다 — 컨트롤러는 enum 을 직접
 * 받지 않고 String 으로 받아 도메인에서 해석하는 패턴(타 컨트롤러 동일).
 */
public enum FeedFilter {
    POPULAR,
    MY_GYM,
    FRIENDS;

    /**
     * 쿼리스트링 → enum 매핑.
     *
     * <p>허용 입력:
     * <ul>
     *   <li>null / 공백 → {@link #POPULAR} (기본값)</li>
     *   <li>"popular", "POPULAR" 등 (대소문자 무시)</li>
     *   <li>"my-gym", "my_gym", "MY-GYM", "myGym" 등 (하이픈/언더스코어/대소문자 허용)</li>
     *   <li>"friends" (대소문자 무시)</li>
     * </ul>
     * 인식 불가 값은 기본값 {@link #POPULAR} 로 폴백한다 — 잘못된 필터 때문에 401/400 을
     * 던지면 클라이언트 UX 가 나빠지므로 silent fallback.
     */
    public static FeedFilter fromQuery(String raw) {
        if (raw == null) return POPULAR;
        String normalized = raw.trim();
        if (normalized.isEmpty()) return POPULAR;
        // 하이픈·언더스코어 제거 후 대문자 비교 — "my-gym" / "MY_GYM" / "myGym" 모두 동일 매칭
        String key = normalized.replace("-", "").replace("_", "").toUpperCase();
        return switch (key) {
            case "POPULAR" -> POPULAR;
            case "MYGYM" -> MY_GYM;
            case "FRIENDS" -> FRIENDS;
            default -> POPULAR;
        };
    }
}
