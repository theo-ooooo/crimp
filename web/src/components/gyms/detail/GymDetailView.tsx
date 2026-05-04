'use client';

import Link from 'next/link';

import { t } from '@/lib/i18n';
import type { GymDetail, RouteItem } from '@/lib/schemas/gym';

import { ErrorCard, DetailSkeleton } from './DetailStates';
import { GymHero } from './GymHero';
import { GymSummary } from './GymSummary';
import { LocationSection } from './LocationSection';
import { MetaSection } from './MetaSection';
import { RoutesSection, type RoutesState } from './RoutesSection';
import { SettingSection } from './SettingSection';

export { DetailSkeleton, ErrorCard };

interface GymDetailViewProps {
  gym: GymDetail;
  routes: RouteItem[];
  routesState: RoutesState;
  routesErrorMessage?: string | null;
  hasNextRoutesPage: boolean;
  isFetchingNextRoutesPage: boolean;
  onLoadMoreRoutes: () => void;
}

export function GymDetailView({
  gym,
  routes,
  routesState,
  routesErrorMessage,
  hasNextRoutesPage,
  isFetchingNextRoutesPage,
  onLoadMoreRoutes,
}: GymDetailViewProps): JSX.Element {
  const startSessionHref =
    `/sessions/new?gymExtId=${encodeURIComponent(gym.extId)}&gymName=${encodeURIComponent(gym.name)}` as const;

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto flex w-full max-w-[520px] flex-col bg-bg pb-24 sm:max-w-5xl sm:px-8 sm:py-8">
        <GymHero gym={gym} />
        <div className="-mt-10 flex flex-col gap-8 rounded-t-[28px] bg-bg px-5 pt-8 shadow-lg sm:mt-6 sm:rounded-2xl sm:border sm:border-hairline sm:p-8">
          <GymSummary gym={gym} routes={routes} />
          <LocationSection gym={gym} />
          <MetaSection gym={gym} />
          <SettingSection gym={gym} routes={routes} />
          <RoutesSection
            routes={routes}
            state={routesState}
            errorMessage={routesErrorMessage}
            hasNextPage={hasNextRoutesPage}
            isFetchingNextPage={isFetchingNextRoutesPage}
            onLoadMore={onLoadMoreRoutes}
          />
          <Link
            href={startSessionHref}
            aria-label={t('gym.detail.startSessionCta')}
            className="sticky bottom-5 z-10 inline-flex h-16 w-full items-center justify-center rounded-xl bg-accent text-title font-extrabold text-accent-on shadow-sm transition-transform duration-fast ease-standard active:scale-[0.98]"
          >
            {t('gym.detail.startSessionCta')}
          </Link>
        </div>
      </div>
    </main>
  );
}
