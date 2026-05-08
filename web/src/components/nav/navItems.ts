import type { ComponentType } from 'react';
import type { Route } from 'next';

import { CrimpIcon, type IconProps } from '@/components/primitives';
import type { MessageKey } from '@/lib/i18n';

/**
 * 글로벌 네비게이션 항목 정의 (PR #108 추출).
 *
 * <p>{@link TopNav} (데스크탑 상단) 와 {@link BottomTabs} (모바일 하단) 가 동일 목록을
 * 공유하도록 단일 진실원으로 분리. 두 컴포넌트가 같은 항목을 다른 layout 으로 렌더하지만
 * 라벨/경로/아이콘은 한 곳에서만 정의.
 */

export interface NavItem {
  /** typed routes 와 호환되는 경로 (`as const` 로 리터럴 유지). */
  readonly href: Route;
  /** 활성 prefix (해당 경로 + 하위). */
  readonly prefix: string;
  /** i18n 라벨 키. */
  readonly labelKey: MessageKey;
  /** CrimpIcon 항목 — fillable 아이콘이어야 active 토글 가능. */
  readonly Icon: ComponentType<IconProps>;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', prefix: '/', labelKey: 'nav.home', Icon: CrimpIcon.home },
  { href: '/feed', prefix: '/feed', labelKey: 'nav.feed', Icon: CrimpIcon.feed },
  // 세션 아이콘은 시계(시간 흐름)로 — `clock` 은 fillable 이 아니므로 active 시 굵기/색만 변경.
  { href: '/sessions', prefix: '/sessions', labelKey: 'nav.sessions', Icon: CrimpIcon.clock },
  // 암장은 위치 핀.
  { href: '/gyms', prefix: '/gyms', labelKey: 'nav.gyms', Icon: CrimpIcon.pin },
  { href: '/crews' as Route, prefix: '/crews', labelKey: 'nav.crews', Icon: CrimpIcon.target },
  { href: '/me', prefix: '/me', labelKey: 'nav.profile', Icon: CrimpIcon.profile },
] as const;

/**
 * 활성 여부 판정. 홈은 정확 매칭, 그 외는 prefix 매칭.
 *  - `/sessions` 활성 시 `/sessions/abc`, `/sessions/new` 도 활성으로 간주.
 *  - `/`(홈)은 다른 모든 경로의 prefix 이므로 정확 매칭만.
 */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.prefix === '/') {
    return pathname === '/';
  }
  return pathname === item.prefix || pathname.startsWith(`${item.prefix}/`);
}
