import type { Me } from '@/lib/schemas/me';

import { shouldShowOnboardingGate } from './onboardingGate';

/**
 * MainGym 온보딩 게이트 분기 회귀 테스트.
 *
 * 기획서 §5.1 의 4가지 케이스(로그아웃 / me 로딩 / mainGym 미설정 + 비-dismiss /
 * 그 외) 를 모두 커버한다. AppRouter 컴포넌트는 가벼운 wrapper 라 별도 component
 * test 는 두지 않고, 본 순수 함수의 분기 매트릭스를 정본으로 둔다.
 */

const MAIN_GYM_VIEW = {
  extId: '01J9USR0000000000000000099',
  name: '클라임파크 강남점',
  brand: '클라임파크',
} as const;

function makeMe(overrides: Partial<Me> = {}): Me {
  const base: Me = {
    extId: '01J9USR0000000000000000001',
    nickname: '서지우',
    nicknameConfigured: true,
  };
  return { ...base, ...overrides };
}

describe('shouldShowOnboardingGate', () => {
  it('returns false when accessToken is null (logged out)', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: null,
        me: makeMe(),
        onboardingDismissed: false,
      }),
    ).toBe(false);
  });

  it('returns false while me is undefined (loading)', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: 'a-token',
        me: undefined,
        onboardingDismissed: false,
      }),
    ).toBe(false);
  });

  it('returns true when authenticated, me has no mainGym, and not dismissed', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: 'a-token',
        me: makeMe({ mainGym: null }),
        onboardingDismissed: false,
      }),
    ).toBe(true);
  });

  it('returns true when mainGym key is omitted from me payload (NON_NULL serialization)', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: 'a-token',
        me: makeMe(),
        onboardingDismissed: false,
      }),
    ).toBe(true);
  });

  it('returns false when mainGym is already set', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: 'a-token',
        me: makeMe({ mainGym: MAIN_GYM_VIEW }),
        onboardingDismissed: false,
      }),
    ).toBe(false);
  });

  it('returns false when user dismissed in current session even if mainGym is null', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: 'a-token',
        me: makeMe({ mainGym: null }),
        onboardingDismissed: true,
      }),
    ).toBe(false);
  });

  it('returns false when mainGym was set after dismiss (set wins, gate stays hidden)', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: 'a-token',
        me: makeMe({ mainGym: MAIN_GYM_VIEW }),
        onboardingDismissed: true,
      }),
    ).toBe(false);
  });
});
