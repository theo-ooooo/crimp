package io.crimp.api.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Set;

/**
 * 인증 쿠키 설정 (PR #94, F5 후속 — HttpOnly 쿠키 전환).
 *
 * <p>웹 클라이언트(Next.js) 가 토큰을 localStorage 가 아니라 HttpOnly 쿠키로 보유하도록
 * 백엔드가 Set-Cookie 응답을 발행한다. 모바일 앱(RN)은 기존처럼 Bearer 헤더 사용 — 본
 * 쿠키 흐름은 OPTIONAL (백엔드가 둘 다 받음).
 *
 * @param domain   쿠키 적용 도메인 (예: {@code .crimp.app}). 로컬 개발은 비워둠.
 * @param secure   HTTPS 전용 여부 (운영=true, 로컬=false).
 * @param sameSite {@code Lax}/{@code Strict}/{@code None}. 기본 {@code Lax} —
 *                 OAuth top-level redirect 호환 + CSRF 기본 방어.
 *                 {@code None} 은 cross-site 호출 허용 (별도 도메인 분리 시), 반드시 secure=true.
 * @param accessName  access 토큰 쿠키 이름 (기본 {@code crimp_access}).
 * @param refreshName refresh 토큰 쿠키 이름 (기본 {@code crimp_refresh}).
 */
@ConfigurationProperties(prefix = "app.auth.cookie")
public record AuthCookieProperties(
        String domain,
        boolean secure,
        String sameSite,
        String accessName,
        String refreshName
) {
    /**
     * SameSite 화이트리스트 — 브라우저 사양과 일치 (PR #94 리뷰 S2).
     * 임의 문자열을 통과시키면 ResponseCookie 가 그대로 헤더에 박아 브라우저가 쿠키 무시.
     */
    private static final Set<String> ALLOWED_SAME_SITE = Set.of("Lax", "Strict", "None");

    public AuthCookieProperties {
        if (sameSite == null || sameSite.isBlank()) sameSite = "Lax";
        if (accessName == null || accessName.isBlank()) accessName = "crimp_access";
        if (refreshName == null || refreshName.isBlank()) refreshName = "crimp_refresh";

        // [PR #94 리뷰 S2] 잘못된 SameSite 값 (예: 오타 'Lex') → 브라우저가 쿠키 무시. 빈 등록 단계에서 차단.
        if (!ALLOWED_SAME_SITE.contains(sameSite)) {
            throw new IllegalStateException(
                    "app.auth.cookie.same-site 는 Lax/Strict/None 중 하나여야 함 (got: " + sameSite + ")");
        }
        // [PR #94 리뷰 S1] SameSite=None 은 브라우저 사양상 Secure 가 동반되어야 함.
        // secure=false + None 조합은 모든 브라우저가 쿠키를 거부 → 조용한 인증 실패.
        if ("None".equals(sameSite) && !secure) {
            throw new IllegalStateException(
                    "app.auth.cookie.same-site=None 은 secure=true 가 필수 (HTTPS 전용)");
        }
    }
}
