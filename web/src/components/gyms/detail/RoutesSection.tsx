'use client';

import {
  CrimpIcon,
  GradeBadge,
  HoldDot,
  SecondaryButton,
  Skeleton,
} from '@/components/primitives';
import type { HoldColorKey } from '@/components/primitives';
import { t } from '@/lib/i18n';
import type { RouteItem } from '@/lib/schemas/gym';
import { colors } from '@/lib/tokens';

import { formatRouteMeta } from './formatters';

export type RoutesState =
  | 'hydrating'
  | 'auth-required'
  | 'loading'
  | 'error'
  | 'empty'
  | 'ready';

interface RoutesSectionProps {
  routes: RouteItem[];
  state: RoutesState;
  errorMessage?: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function RoutesSection({
  routes,
  state,
  errorMessage,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: RoutesSectionProps): JSX.Element {
  return (
    <section aria-labelledby="gym-routes-title" className="flex flex-col gap-4">
      <h2 id="gym-routes-title" className="text-h2 font-extrabold text-text">
        {t('gym.detail.routesTitle')}
      </h2>
      <RoutesBody routes={routes} state={state} errorMessage={errorMessage} />
      {state === 'ready' && hasNextPage ? (
        <div className="mx-auto w-full max-w-xs">
          <SecondaryButton onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? t('common.loading') : t('gym.detail.loadMore')}
          </SecondaryButton>
        </div>
      ) : null}
    </section>
  );
}

function RoutesBody({
  routes,
  state,
  errorMessage,
}: {
  routes: RouteItem[];
  state: RoutesState;
  errorMessage?: string | null;
}): JSX.Element {
  if (state === 'hydrating' || state === 'loading') return <RoutesSkeleton />;
  if (state === 'auth-required') return <AuthRequiredCard />;
  if (state === 'error') {
    return (
      <RouteErrorCard
        title={t('gym.detail.routesErrorTitle')}
        message={errorMessage ?? t('gym.detail.routesErrorTitle')}
      />
    );
  }
  if (state === 'empty') return <EmptyRoutes />;
  return (
    <ul className="flex flex-col gap-2.5">
      {routes.slice(0, 8).map((r) => (
        <li key={r.extId}>
          <RouteCard route={r} />
        </li>
      ))}
    </ul>
  );
}

function RouteCard({ route }: { route: RouteItem }): JSX.Element {
  const gradeLabel = route.gradeValue ?? '—';
  const name = route.name ?? gradeLabel;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-subtle p-4 shadow-xs">
      <HoldDotSafe color={route.color} />
      <GradeBadge v={gradeLabel} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body font-extrabold text-text">{name}</p>
        <p className="truncate text-caption font-semibold text-text-3">
          {formatRouteMeta(route)}
        </p>
      </div>
    </div>
  );
}

function HoldDotSafe({ color }: { color: string | null | undefined }): JSX.Element {
  if (color && color in colors.hold) {
    return <HoldDot color={color as HoldColorKey} size={14} />;
  }
  return <HoldDot color="gray" size={14} />;
}

function AuthRequiredCard(): JSX.Element {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 rounded-xl bg-subtle px-6 py-10 text-center shadow-xs"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-text-3">
        <CrimpIcon.profile s={24} />
      </div>
      <p className="text-body font-semibold text-text-2">
        {t('gym.detail.routesAuthRequired')}
      </p>
    </div>
  );
}

function EmptyRoutes(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-subtle px-6 py-10 text-center shadow-xs">
      <p className="text-body font-semibold text-text-2">
        {t('gym.detail.routesEmpty')}
      </p>
    </div>
  );
}

function RoutesSkeleton(): JSX.Element {
  return (
    <ul className="flex flex-col gap-2.5" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-xl bg-subtle p-4 shadow-xs"
        >
          <Skeleton h={14} w={14} r={7} />
          <Skeleton h={22} w={44} r={11} />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton h={14} w="55%" />
            <Skeleton h={12} w="35%" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RouteErrorCard({
  title,
  message,
}: {
  title: string;
  message: string;
}): JSX.Element {
  return (
    <div role="alert" className="rounded-xl bg-subtle p-5 shadow-xs">
      <p className="text-title font-bold text-danger">{title}</p>
      <p className="mt-1 text-body text-text-2">{message}</p>
    </div>
  );
}
