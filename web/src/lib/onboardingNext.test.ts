import { describe, expect, it } from 'vitest';

import { resolveNext } from './onboardingNext';

/**
 * Open redirect 방어 회귀 테스트.
 *
 * 게이트가 next 쿼리로 받은 경로로 `router.replace` 하기 때문에, 외부 도메인이나
 * 위험한 스킴이 통과하면 피싱 / 토큰 탈취 경로가 된다. 모든 비정상 입력은 폴백
 * 경로(`/`) 로 무력화되어야 한다.
 */
describe('resolveNext', () => {
  it('falls back to / for null', () => {
    expect(resolveNext(null)).toBe('/');
  });

  it('falls back to / for undefined', () => {
    expect(resolveNext(undefined)).toBe('/');
  });

  it('falls back to / for empty string', () => {
    expect(resolveNext('')).toBe('/');
  });

  it('passes through internal absolute paths', () => {
    expect(resolveNext('/me')).toBe('/me');
    expect(resolveNext('/sessions/abc-123')).toBe('/sessions/abc-123');
    expect(resolveNext('/feed?filter=my-gym')).toBe('/feed?filter=my-gym');
  });

  it('blocks absolute external URLs', () => {
    expect(resolveNext('http://evil.com')).toBe('/');
    expect(resolveNext('https://evil.com/path')).toBe('/');
  });

  it('blocks dangerous URI schemes', () => {
    expect(resolveNext('javascript:alert(1)')).toBe('/');
    expect(resolveNext('data:text/html,xss')).toBe('/');
    expect(resolveNext('vbscript:msgbox')).toBe('/');
  });

  it('blocks protocol-relative paths', () => {
    expect(resolveNext('//evil.com')).toBe('/');
    expect(resolveNext('//evil.com/path')).toBe('/');
  });

  it('blocks backslash-mixed paths (browser normalizes \\\\ to //)', () => {
    expect(resolveNext('/\\evil.com')).toBe('/');
    expect(resolveNext('/\\\\evil.com')).toBe('/');
    expect(resolveNext('/me\\path')).toBe('/');
  });

  it('blocks self-redirect to /onboarding/main-gym', () => {
    expect(resolveNext('/onboarding/main-gym')).toBe('/');
    expect(resolveNext('/onboarding/main-gym?next=/me')).toBe('/');
    expect(resolveNext('/onboarding/main-gym/anything')).toBe('/');
  });

  it('does not over-block unrelated paths that share the prefix', () => {
    // /onboarding/main-gym 정확 매칭만 self-loop 로 본다.
    expect(resolveNext('/onboarding')).toBe('/onboarding');
    expect(resolveNext('/onboarding/other-step')).toBe('/onboarding/other-step');
  });

  it('blocks relative paths without leading slash', () => {
    expect(resolveNext('me')).toBe('/');
    expect(resolveNext('../etc/passwd')).toBe('/');
  });
});
