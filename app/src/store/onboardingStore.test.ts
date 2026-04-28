import { useOnboardingStore } from './onboardingStore';

/**
 * `useOnboardingStore` 단위 테스트.
 *
 * dismiss/reset 의 단순 토글이지만, 로그아웃 시 reset 누락 회귀를 막기 위해
 * 명시적으로 검증한다 (RootNavigator 가 dismiss 상태를 그대로 유지하면 다음 계정의
 * 게이트가 부정확하게 우회된다).
 */
describe('useOnboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it('starts with dismissedThisSession=false', () => {
    expect(useOnboardingStore.getState().dismissedThisSession).toBe(false);
  });

  it('dismiss() sets dismissedThisSession=true', () => {
    useOnboardingStore.getState().dismiss();
    expect(useOnboardingStore.getState().dismissedThisSession).toBe(true);
  });

  it('reset() clears dismiss back to false', () => {
    useOnboardingStore.getState().dismiss();
    useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState().dismissedThisSession).toBe(false);
  });

  it('reset() is idempotent on a fresh store', () => {
    useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState().dismissedThisSession).toBe(false);
  });
});
