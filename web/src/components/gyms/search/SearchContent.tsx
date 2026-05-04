'use client';

import Link from 'next/link';

import { KakaoGymMap } from '@/components/gyms/KakaoGymMap';
import { CrimpIcon } from '@/components/primitives';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';

import { GymCard } from './GymCard';
import { EmptyState, SearchErrorCard, SearchSkeleton } from './SearchStates';

export function SearchContent({
  items,
  featured,
  isLoading,
  errorMessage,
}: {
  items: GymItem[];
  featured: GymItem[];
  isLoading: boolean;
  errorMessage: string | null;
}): JSX.Element {
  if (isLoading) return <SearchSkeleton />;
  if (errorMessage) {
    return <SearchErrorCard title={t('gym.list.errorTitle')} message={errorMessage} />;
  }
  if (items.length === 0) return <EmptyState />;

  return (
    <>
      <section className="flex flex-col gap-3" aria-label="주변 암장 지도">
        <div className="flex items-center justify-between">
          <h2 className="text-title font-extrabold text-text">주변 암장</h2>
          <span className="text-caption font-semibold text-text-3">거리순</span>
        </div>
        <Link href="/gyms/map" aria-label="지도 보기">
          <KakaoGymMap
            points={featured.map((gym) => ({
              id: gym.extId,
              name: gym.name,
              lat: gym.lat ?? '',
              lng: gym.lng ?? '',
            }))}
            className="h-[188px]"
            cta="지도 보기"
          />
        </Link>
      </section>

      <section className="flex flex-col gap-3" aria-label="인기 있는 곳">
        <div className="flex items-center justify-between">
          <h2 className="text-title font-extrabold text-text">인기 있는 곳</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-caption font-bold text-text-3">
            <CrimpIcon.target s={12} />
            거리순
          </span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((g) => (
            <li key={g.extId}>
              <GymCard gym={g} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
