'use client';

import { useParams } from 'next/navigation';

import {
  DetailSkeleton,
  ErrorCard,
  GymDetailView,
} from '@/components/gyms/detail/GymDetailView';
import { useGymQuery, useGymRoutesQuery } from '@/hooks/useGyms';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { RouteItem } from '@/lib/schemas/gym';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

export default function GymDetailPage(): JSX.Element {
  const params = useParams<{ extId: string }>();
  const extId = params?.extId ?? null;
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();

  const gymQuery = useGymQuery(extId);
  const routesQuery = useGymRoutesQuery(accessToken, extId, 50);

  if (!extId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 bg-bg px-6">
        <p role="alert" className="text-body text-danger">
          {t('gym.detail.errorTitle')}
        </p>
      </main>
    );
  }

  if (gymQuery.isLoading) return <DetailSkeleton />;

  if (gymQuery.error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-bg px-6 py-10">
        <ErrorCard
          title={t('gym.detail.errorTitle')}
          message={toUserMessage(gymQuery.error)}
        />
      </main>
    );
  }

  const gym = gymQuery.data;
  if (!gym) return <DetailSkeleton />;

  const routes: RouteItem[] =
    routesQuery.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <GymDetailView
      gym={gym}
      routes={routes}
      routesState={getRoutesState({
        hydrated,
        accessToken,
        loading: routesQuery.isLoading,
        error: Boolean(routesQuery.error),
        empty: routes.length === 0,
      })}
      routesErrorMessage={routesQuery.error ? toUserMessage(routesQuery.error) : null}
      hasNextRoutesPage={Boolean(routesQuery.hasNextPage)}
      isFetchingNextRoutesPage={routesQuery.isFetchingNextPage}
      onLoadMoreRoutes={() => {
        void routesQuery.fetchNextPage();
      }}
    />
  );
}

function getRoutesState({
  hydrated,
  accessToken,
  loading,
  error,
  empty,
}: {
  hydrated: boolean;
  accessToken: string | null;
  loading: boolean;
  error: boolean;
  empty: boolean;
}): 'hydrating' | 'auth-required' | 'loading' | 'error' | 'empty' | 'ready' {
  if (!hydrated) return 'hydrating';
  if (!accessToken) return 'auth-required';
  if (loading) return 'loading';
  if (error) return 'error';
  if (empty) return 'empty';
  return 'ready';
}
