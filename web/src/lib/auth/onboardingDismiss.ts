/**
 * MainGym 온보딩 게이트의 "현재 브라우저 세션 한정" dismiss 플래그.
 *
 * 기획서(`docs/기획/maingym-onboarding.md` §5.1) 상 mainGym 이 비어 있는 동안은
 * 매 세션마다 게이트를 재노출한다. 사용자가 "나중에 정할게요" 를 누르면 이 모듈로
 * 같은 탭/세션에 한해서만 게이트를 닫는다 — 새 탭이나 브라우저 재시작 시
 * sessionStorage 가 비어있어 게이트가 다시 뜬다.
 *
 * `oauthState.ts` 와 같은 격리 패턴 (SSR 안전 + 의도가 명확한 단일 키).
 */

const KEY = 'crimp.onboarding.dismissed';
const VALUE = '1';

export const onboardingDismiss = {
  /** 현재 세션에서 게이트를 dismiss 했는지 — SSR 환경에서는 항상 false. */
  isDismissed(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(KEY) === VALUE;
    } catch {
      // private 모드 등 sessionStorage 접근 불가 — 게이트는 그대로 노출.
      return false;
    }
  },

  /** "나중에 정할게요" 액션 시 호출. */
  set(): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(KEY, VALUE);
    } catch {
      /* private 모드 등 — silent ignore */
    }
  },

  /** 로그아웃 시 호출 — 다음 계정 진입을 깨끗하게. */
  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(KEY);
    } catch {
      /* silent ignore */
    }
  },
};
