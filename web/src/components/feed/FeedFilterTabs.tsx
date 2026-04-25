'use client';

/**
 * 피드 상단 필터 탭 — `친구 / 인기 / 내 암장`.
 *
 * 디자인 (`docs/design/claude/v2/screens-ios-2.jsx:488-492`):
 * - padding `0 20px 8px`, gap 6, 가로 스크롤
 * - 활성 칩은 `bg-text / text-bg` (Chip 프리미티브 기본 active 스타일)
 *
 * 디자인 명세상 기본값은 `친구` (active) 이지만, 실제 active 값은 호출부 상태로 제어.
 */

import type { FC } from 'react';

import { Chip } from '@/components/primitives';
import { t } from '@/lib/i18n';
import type { FeedFilter } from '@/lib/schemas/feed';

interface TabDef {
  filter: FeedFilter;
  labelKey:
    | 'feed.filter.friends'
    | 'feed.filter.popular'
    | 'feed.filter.myGym';
}

/** 탭 노출 순서 — 디자인 mock 과 동일 (친구·인기·내 암장). */
const TABS: readonly TabDef[] = [
  { filter: 'friends', labelKey: 'feed.filter.friends' },
  { filter: 'popular', labelKey: 'feed.filter.popular' },
  { filter: 'my-gym', labelKey: 'feed.filter.myGym' },
] as const;

export interface FeedFilterTabsProps {
  active: FeedFilter;
  onChange: (next: FeedFilter) => void;
}

export const FeedFilterTabs: FC<FeedFilterTabsProps> = ({
  active,
  onChange,
}) => (
  <div
    role="tablist"
    aria-label={t('feed.filter.label')}
    // 가로 스크롤 + 스크롤바 숨김(시각적). 키보드 포커스는 정상 동작.
    className="flex gap-1.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    {TABS.map((tab) => {
      const isActive = tab.filter === active;
      return (
        <Chip
          key={tab.filter}
          role="tab"
          aria-selected={isActive}
          active={isActive}
          onClick={() => {
            if (!isActive) onChange(tab.filter);
          }}
        >
          {t(tab.labelKey)}
        </Chip>
      );
    })}
  </div>
);
