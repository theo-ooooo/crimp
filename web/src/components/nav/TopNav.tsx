'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { CrimpLogo } from '@/components/primitives';
import { t } from '@/lib/i18n';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

import { isNavItemActive, NAV_ITEMS, type NavItem } from './navItems';

/**
 * 글로벌 상단 내비게이션 바.
 *
 * 표시 규칙:
 * - hydration 전: SSR/CSR 텍스트 일치 보장을 위해 `null` 반환.
 * - 비로그인 (accessToken 없음): `null` 반환.
 * - 로그인 페이지 (`/login`): `null` 반환 — 인증 흐름 중에는 잡음 제거.
 *
 * 디자인:
 * - sticky top, `max-w-2xl` 본문 너비와 일치 (페이지 본문 컨테이너와 시각적 정합).
 * - 좌: 브랜드 로고 ("Crimp"), 우: 5개 주요 메뉴 + 프로필 아이콘.
 * - 활성 링크: `text-text` (라이트/다크 적응) + `font-bold` + 하단 라임 액센트 라인.
 *   (`accent-ink` 는 라임 위 글씨용 다크 톤 — 다크 모드 페이지 bg 위에서는 invisible.)
 * - 비활성 링크: `text-text-2`, hover 시 `text-text` 트랜지션.
 * - 모바일 (sm 미만): 라벨 숨기고 아이콘만 노출 → compact bar.
 *
 * 활성 판정:
 * - 정확 매칭 또는 같은 prefix(`/sessions/...`)인 경우 활성.
 * - 단, 홈("/")은 정확 매칭만 (다른 모든 경로의 prefix 이므로).
 */

export function TopNav(): JSX.Element | null {
  const hydrated = useTokenStore((s) => s.hydrated);
  const hydrate = useTokenStore((s) => s.hydrate);
  const accessToken = useAccessToken();
  const pathname = usePathname();

  // 페이지 진입 시 단 한 번 hydrate — 페이지 컴포넌트가 따로 호출하지 않더라도 안전.
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  // 1) hydration 전에는 mismatch 방지를 위해 렌더링하지 않는다.
  // 2) 로그인 페이지에서는 노출하지 않는다 (인증 흐름 중 잡음 최소화).
  // 3) 비로그인 상태에서는 노출하지 않는다.
  if (!hydrated) return null;
  if (!accessToken) return null;
  // I3: /login 뿐 아니라 /login/callback (OAuth redirect 후 교환 진행 페이지) 도 hide.
  if (pathname === '/login' || pathname.startsWith('/login/')) return null;

  return (
    // I2: HTML5 <header> 가 암시적으로 banner role 을 가져 명시 role 제거 (redundant).
    // [PR #108] 데스크탑 전용 — md 미만 (모바일/태블릿) 은 BottomTabs 가 책임.
    <header
      className="sticky top-0 z-40 hidden border-b border-hairline bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75 md:block"
    >
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t('common.brand')}
          className="inline-flex items-center transition-opacity duration-fast ease-standard hover:opacity-80"
        >
          {/* [PR #106] 워드마크 형태로 노출 — width 64 로 nav 텍스트(~16px) 와 시각 무게 정합.
              너무 크면 헤더 위아래로 튀어나와 보이고, 너무 작으면 워드마크 텍스트 가독성 저하. */}
          <CrimpLogo variant="wordmark" width={64} />
        </Link>
        <nav aria-label={t('nav.ariaLabel')}>
          <ul className="flex items-center gap-0.5 sm:gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLinkItem
                key={item.href}
                item={item}
                active={isNavItemActive(pathname, item)}
              />
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

interface NavLinkItemProps {
  item: NavItem;
  active: boolean;
}

/**
 * 개별 nav 링크.
 * - 모바일: 아이콘만 (44x44 터치 타깃)
 * - sm 이상: 아이콘 + 라벨 가로 배치
 * - 활성 시 라벨/아이콘 강조 + 하단 2px 라임 인디케이터
 */
function NavLinkItem({ item, active }: NavLinkItemProps): JSX.Element {
  const { Icon } = item;
  const label = t(item.labelKey);

  // 활성: `text-text` (라이트/다크 자동 적응) + bold. accent-ink 는 라임 위 글씨용
  // 다크 톤이라 다크 모드 페이지 bg 위에서 보이지 않음. 활성 강조는 하단 라임 인디케이터로.
  const colorClass = active
    ? 'text-text font-bold'
    : 'text-text-2 hover:text-text';

  return (
    <li>
      <Link
        href={item.href}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={[
          'relative flex h-11 items-center justify-center rounded-md px-2 sm:px-3',
          // I4: 모바일 (sm 미만) 에선 라벨이 hidden 이라 text-caption 의 영향이 없지만,
          // sm 이상에서 라벨이 노출될 때만 적용된다.
          'text-caption transition-colors duration-fast ease-standard sm:text-body',
          // I1: 키보드 포커스 시각 표시 — focus-visible 로 마우스 클릭 시는 노출하지 않음.
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
          colorClass,
        ].join(' ')}
      >
        <span className="flex items-center gap-1.5">
          <Icon
            s={20}
            // fillable 아이콘 (home/feed/profile) 만 active 시 채움 효과.
            fill={active}
            aria-hidden
          />
          <span className="hidden sm:inline">{label}</span>
        </span>
        {active && (
          <span
            // 하단 라임 인디케이터 — 활성 링크 강조용.
            aria-hidden
            className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
          />
        )}
      </Link>
    </li>
  );
}

export default TopNav;
