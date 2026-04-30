'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { t } from '@/lib/i18n';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

import { isNavItemActive, NAV_ITEMS, type NavItem } from './navItems';

/**
 * 모바일용 하단 탭 네비게이션 (PR #108).
 *
 * <p>{@link TopNav} 의 모바일 버전 — 모바일 (md 미만) 화면에서 fixed 하단에 표시되며
 * TopNav 자리를 대체. 데스크탑은 TopNav 가 그대로 노출되고 본 컴포넌트는 hidden.
 *
 * <p>표시 규칙 (TopNav 와 동일):
 * - hydration 전: SSR/CSR mismatch 방지 위해 null
 * - 비로그인: null
 * - 로그인 페이지 (`/login*`): null — 인증 흐름 잡음 제거
 *
 * <p>레이아웃:
 * - {@code fixed bottom-0 inset-x-0 z-40} — 페이지 스크롤과 무관하게 항상 노출
 * - 5개 탭 균등 분할 (`flex-1`), 각 탭 height 56 + safe-area inset-bottom
 * - 활성 탭: 라임 인디케이터 (TopNav 와 시각 일관)
 * - 비활성 탭: text-text-2, hover 시 text-text
 *
 * <p>페이지 컨텐츠가 탭 뒤에 가려지지 않게 본 컴포넌트는 자체적으로 padding 추가하지 않음 —
 * 호출 측 페이지가 `pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0` 같은 패턴을 적용.
 * (TopNav 와의 차이: TopNav 는 sticky top 이라 컨텐츠 위 영역만 차지하지만, BottomTabs 는
 * fixed 라 컨텐츠가 그 아래로 흐르므로 마지막 영역의 가림을 피하기 위해 pb 보정 필요.)
 */
export function BottomTabs(): JSX.Element | null {
  const hydrated = useTokenStore((s) => s.hydrated);
  const hydrate = useTokenStore((s) => s.hydrate);
  const accessToken = useAccessToken();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  if (!hydrated) return null;
  if (!accessToken) return null;
  if (pathname === '/login' || pathname.startsWith('/login/')) return null;

  return (
    <nav
      // md 미만 (모바일/태블릿) 에서만 노출. 데스크탑은 TopNav 가 책임.
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85 md:hidden"
      aria-label={t('nav.ariaLabel')}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex h-14 max-w-2xl">
        {NAV_ITEMS.map((item) => (
          <BottomTabItem
            key={item.href}
            item={item}
            active={isNavItemActive(pathname, item)}
          />
        ))}
      </ul>
    </nav>
  );
}

interface BottomTabItemProps {
  item: NavItem;
  active: boolean;
}

function BottomTabItem({ item, active }: BottomTabItemProps): JSX.Element {
  const { Icon } = item;
  const label = t(item.labelKey);
  const colorClass = active ? 'text-text font-bold' : 'text-text-2';

  return (
    <li className="flex-1">
      <Link
        href={item.href}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={[
          'relative flex h-full flex-col items-center justify-center gap-0.5 transition-colors duration-fast ease-standard',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
          colorClass,
        ].join(' ')}
      >
        <Icon s={22} fill={active} aria-hidden />
        <span className="text-[10px] leading-tight">{label}</span>
        {active && (
          <span
            aria-hidden
            // 상단 라임 인디케이터 — TopNav 의 하단 인디케이터와 시각 거울 (탭바 위치 반영).
            className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-accent"
          />
        )}
      </Link>
    </li>
  );
}

export default BottomTabs;
