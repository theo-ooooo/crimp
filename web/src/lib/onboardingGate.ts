import type { Me } from '@/lib/schemas/me';

/**
 * MainGym 온보딩 게이트 노출 여부.
 *
 * 기획 (`docs/기획/maingym-onboarding.md` §5.1) — 다음 모두 참일 때만 게이트를
 * 띄운다 (= `/onboarding/main-gym` 으로 redirect). 그 외에는 미표시.
 *
 *  1. 토큰이 있다 (`accessToken !== null`)
 *  2. me 가 도착했다 (`me !== undefined`)
 *  3. me.mainGym 이 비어 있다
 *  4. 현재 세션에서 사용자가 게이트를 dismiss 하지 않았다
 *
 * me 가 아직 로딩 중이면 (`me === undefined`) false 를 반환해 짧게 보호 페이지가
 * 노출되도록 한다 — 미설정 상태가 확정된 뒤에만 redirect 를 트리거한다.
 *
 * App 의 `app/src/lib/onboardingGate.ts` 와 1:1 동일 로직. 두 프로젝트 모두 같은
 * 기획 §5.1 을 단일 source-of-truth 로 따르므로 함수 본체가 어긋나지 않도록 유지.
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
