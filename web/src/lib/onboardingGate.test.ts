import { describe, expect, it } from 'vitest';

import type { Me } from '@/lib/schemas/me';

import { shouldShowOnboardingGate } from './onboardingGate';

/**
 * 기획서 §5.1 의 4가지 케이스(로그아웃 / me 로딩 / mainGym 미설정 + 비-dismiss /
 * 그 외) 회귀 테스트. App 측 동일 함수 테스트와 1:1 정합 유지.
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
    bio: null,
    levelSelf: null,
    mainGymId: null,
    avatarMediaId: null,
  };
  return { ...base, ...overrides };
}

describe('shouldShowOnboardingGate', () => {
  it('returns false when accessToken is null', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: null,
        me: makeMe(),
        onboardingDismissed: false,
      }),
    ).toBe(false);
  });

  it('returns false while me is loading (undefined)', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: 'a',
        me: undefined,
        onboardingDismissed: false,
      }),
    ).toBe(false);
  });

  it('returns true when authenticated and me has no mainGym', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: 'a',
        me: makeMe({ mainGym: null }),
        onboardingDismissed: false,
      }),
    ).toBe(true);
  });

  it('returns true when mainGym key is omitted from payload', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: 'a',
        me: makeMe(),
        onboardingDismissed: false,
      }),
    ).toBe(true);
  });

  it('returns false when mainGym is already set', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: 'a',
        me: makeMe({ mainGym: MAIN_GYM_VIEW }),
        onboardingDismissed: false,
      }),
    ).toBe(false);
  });

  it('returns false when user dismissed in current session', () => {
    expect(
      shouldShowOnboardingGate({
        accessToken: 'a',
        me: makeMe({ mainGym: null }),
        onboardingDismissed: true,
      }),
    ).toBe(false);
  });
});
