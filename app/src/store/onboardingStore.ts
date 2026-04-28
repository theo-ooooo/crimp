import { create } from 'zustand';

/**
 * MainGym 온보딩 게이트의 "현재 앱 실행 한정" dismiss 플래그.
 *
 * 기획서(`docs/기획/maingym-onboarding.md` §5.1) 상 mainGym 이 비어 있는 동안은
 * 매 앱 실행마다 게이트를 재노출한다. 사용자가 명시적으로 "나중에 정할게요" 를
 * 선택하면 같은 실행 안에서만 게이트를 닫는다 — 앱이 종료되면 zustand 상태도
 * 휘발하므로 다음 실행에 다시 게이트가 뜬다 (persist 안 함).
 *
 * 로그아웃 시 다음 계정의 진입을 깨끗하게 만들기 위해 `reset()` 을 호출한다
 * (`useLogout` 에서 처리).
 */
export interface OnboardingState {
  dismissedThisSession: boolean;
  dismiss: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  dismissedThisSession: false,
  dismiss: () => set({ dismissedThisSession: true }),
  reset: () => set({ dismissedThisSession: false }),
}));
