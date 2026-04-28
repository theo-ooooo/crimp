import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { onboardingDismiss } from './onboardingDismiss';

/**
 * `onboardingDismiss` 모듈은 sessionStorage 의 단일 키 (`crimp.onboarding.dismissed`)
 * 만 다룬다. SSR 환경(`window === undefined`) 안전성과 storage 접근 실패(예: private
 * 모드) 시 silent 폴백을 보장하는 게 핵심.
 */

describe('onboardingDismiss', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('isDismissed() returns false on a fresh session', () => {
    expect(onboardingDismiss.isDismissed()).toBe(false);
  });

  it('set() then isDismissed() returns true', () => {
    onboardingDismiss.set();
    expect(onboardingDismiss.isDismissed()).toBe(true);
  });

  it('clear() removes the dismiss flag', () => {
    onboardingDismiss.set();
    onboardingDismiss.clear();
    expect(onboardingDismiss.isDismissed()).toBe(false);
  });

  it('isDismissed() ignores unrelated values stored under the key', () => {
    window.sessionStorage.setItem('crimp.onboarding.dismissed', 'truthy-but-not-1');
    expect(onboardingDismiss.isDismissed()).toBe(false);
  });

  it('returns false silently when sessionStorage.getItem throws (private mode)', () => {
    const spy = vi
      .spyOn(window.sessionStorage, 'getItem')
      .mockImplementation(() => {
        throw new Error('SecurityError');
      });
    expect(onboardingDismiss.isDismissed()).toBe(false);
    spy.mockRestore();
  });

  it('set() does not throw when sessionStorage.setItem fails', () => {
    const spy = vi
      .spyOn(window.sessionStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    expect(() => onboardingDismiss.set()).not.toThrow();
    spy.mockRestore();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });
});
