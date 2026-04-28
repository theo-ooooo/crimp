import type { Me } from '@/lib/schemas/me';

/**
 * MainGym 온보딩 게이트 노출 여부.
 *
 * 기획 (`docs/기획/maingym-onboarding.md` §5.1) — 다음 모두 참일 때만 게이트를
 * 띄운다. 그 외에는 미표시 → MainTabs (또는 LoginStack) 가 그대로 보인다.
 *
 *  1. 토큰이 있다 (`accessToken !== null`)
 *  2. me 가 도착했다 (`me !== undefined`)
 *  3. me.mainGym 이 비어 있다
 *  4. 현재 앱 실행에서 사용자가 게이트를 dismiss 하지 않았다
 *
 * me 가 아직 로딩 중이면 (`me === undefined`) false 를 반환해 짧게 MainTabs 가
 * 노출되도록 한다 — 미설정 상태가 확정된 뒤에만 게이트를 노출한다.
 *
 * 별도 함수로 분리한 이유: AppRouter 의 4 케이스(로그아웃 / 로딩 / 미설정 + 비-dismiss /
 * 그 외) 를 component renderer 없이 단위 테스트로 회귀 잡기 위함.
 */
export function shouldShowOnboardingGate(args: {
  accessToken: string | null;
  me: Me | undefined;
  onboardingDismissed: boolean;
}): boolean {
  const { accessToken, me, onboardingDismissed } = args;
  return (
    accessToken !== null &&
    me !== undefined &&
    me.mainGym == null &&
    !onboardingDismissed
  );
}
