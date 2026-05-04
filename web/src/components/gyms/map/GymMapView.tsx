'use client';

import Link from 'next/link';

import { KakaoGymMap } from '@/components/gyms/KakaoGymMap';
import { CrimpIcon, SecondaryButton, Skeleton } from '@/components/primitives';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';

interface GymMapViewProps {
  gyms: GymItem[];
  isLoading: boolean;
  errorMessage: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function GymMapView({
  gyms,
  isLoading,
  errorMessage,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: GymMapViewProps): JSX.Element {
  const points = gyms
    .filter((gym) => gym.lat != null && gym.lng != null)
    .map((gym) => ({
      id: gym.extId,
      name: gym.name,
      lat: gym.lat!,
      lng: gym.lng!,
    }));

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 pb-20 pt-8 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/gyms"
              aria-label="암장 찾기로 돌아가기"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-text shadow-xs"
            >
              <CrimpIcon.chevL s={22} />
            </Link>
            <div>
              <h1 className="text-h1 font-extrabold text-text">지도 보기</h1>
              <p className="text-caption font-semibold text-text-3">
                {points.length > 0 ? `${points.length}곳 표시 중` : ' '}
              </p>
            </div>
          </div>
        </header>

        {isLoading ? (
          <MapSkeleton />
        ) : errorMessage ? (
          <MapError message={errorMessage} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <KakaoGymMap points={points} className="h-[62vh] min-h-[420px]" level={6} />
            <aside className="flex max-h-[62vh] flex-col gap-3 overflow-y-auto rounded-xl border border-hairline bg-bg p-2">
              {gyms.map((gym) => (
                <MapGymRow key={gym.extId} gym={gym} />
              ))}
              {hasNextPage ? (
                <SecondaryButton onClick={onLoadMore} disabled={isFetchingNextPage}>
                  {isFetchingNextPage
                    ? t('common.loading')
                    : t('gym.list.loadMore')}
                </SecondaryButton>
              ) : null}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function MapGymRow({ gym }: { gym: GymItem }): JSX.Element {
  return (
    <Link
      href={`/gyms/${encodeURIComponent(gym.extId)}`}
      className="flex items-center gap-3 rounded-xl bg-subtle p-3 transition-transform duration-fast ease-standard active:scale-[0.99]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-title font-extrabold text-text">
        {gym.name.trim().charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-extrabold text-text">{gym.name}</p>
        <p className="truncate text-caption font-semibold text-text-3">
          {gym.address ?? t('gym.list.addressFallback')}
        </p>
      </div>
      <CrimpIcon.chevR s={16} className="text-text-4" />
    </Link>
  );
}

function MapSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true">
      <Skeleton h={520} r={16} />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} h={72} r={16} />
        ))}
      </div>
    </div>
  );
}

function MapError({ message }: { message: string }): JSX.Element {
  return (
    <div role="alert" className="rounded-xl bg-subtle p-5 shadow-xs">
      <p className="text-title font-bold text-danger">{t('gym.list.errorTitle')}</p>
      <p className="mt-1 text-body text-text-2">{message}</p>
    </div>
  );
}
