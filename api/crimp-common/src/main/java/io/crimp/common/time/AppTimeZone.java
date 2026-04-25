package io.crimp.common.time;

import java.time.ZoneId;

/**
 * 애플리케이션 표준 timezone 상수.
 *
 * <p>Phase 1 타깃이 국내 클라이머라서 주간 캘린더·표시 타임스탬프는 KST 를 기본값으로 사용.
 * DB 에 저장되는 모든 Instant 는 여전히 UTC 기준이며, 사용자 노출 계산(주 경계·그룹핑)에서만 KST 로 변환한다.
 *
 * <p>Phase 2 에서 사용자 프로필에 timezone 필드를 추가하면 컨트롤러가 User 엔티티에서 읽어 전달한다.
 */
public final class AppTimeZone {

    /** Asia/Seoul (UTC+9, DST 없음). */
    public static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private AppTimeZone() {}
}
