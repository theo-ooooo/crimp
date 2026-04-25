'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  CrimpIcon,
  GradeBadge,
  HoldDot,
  SecondaryButton,
  Skeleton,
} from '@/components/primitives';
import type { HoldColorKey } from '@/components/primitives';
import { useGymQuery, useGymRoutesQuery } from '@/hooks/useGyms';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { GymDetail, RouteItem } from '@/lib/schemas/gym';
import { colors } from '@/lib/tokens';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * `/gyms/[extId]` — 암장 상세 + 활성 루트 목록.
 *
 * 데이터 소스:
 * - `/api/v1/gyms/{extId}` (공개) — 상세 메타
 * - `/api/v1/gyms/{extId}/routes` (Bearer 필요) — 활성 루트
 *
 * hydration gate 는 루트 fetch 가 accessToken 에 의존하기 때문에 필요.
 * 상세 조회 자체는 토큰과 무관.
 */
export default function GymDetailPage(): JSX.Element {
  const params = useParams<{ extId: string }>();
  const extId = params?.extId ?? null;
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();

  const gymQuery = useGymQuery(extId);
  const routesQuery = useGymRoutesQuery(accessToken, extId);

  if (!extId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 bg-bg px-6">
        <p role="alert" className="text-body text-danger">
          {t('gym.detail.errorTitle')}
        </p>
      </main>
    );
  }

  if (gymQuery.isLoading) {
    return <DetailSkeleton />;
  }

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
  if (!gym) {
    return <DetailSkeleton />;
  }

  const routes: RouteItem[] =
    routesQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const encodedName = encodeURIComponent(gym.name);
  const startSessionHref =
    `/sessions/new?gymId=${encodeURIComponent(gym.extId)}&gymName=${encodedName}` as const;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-bg px-6 py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <h1 className="flex-1 text-h1 font-extrabold tracking-[-0.04em] text-text">
            {gym.name}
          </h1>
          {gym.brand ? (
            <span className="mt-1 inline-flex shrink-0 items-center rounded-full bg-chip px-3 py-1 text-caption font-semibold text-text-2">
              {gym.brand}
            </span>
          ) : null}
        </div>
        {gym.address ? (
          <p className="text-body text-text-2">{gym.address}</p>
        ) : null}
      </header>

      <MetaCard gym={gym} />

      <section
        aria-labelledby="gym-routes-title"
        className="flex flex-col gap-4"
      >
        <h2
          id="gym-routes-title"
          className="text-h2 font-extrabold tracking-[-0.03em] text-text"
        >
          {t('gym.detail.routesTitle')}
        </h2>

        {!hydrated ? (
          <RoutesSkeleton />
        ) : !accessToken ? (
          <AuthRequiredCard />
        ) : routesQuery.isLoading ? (
          <RoutesSkeleton />
        ) : routesQuery.error ? (
          <ErrorCard
            title={t('gym.detail.routesErrorTitle')}
            message={toUserMessage(routesQuery.error)}
          />
        ) : routes.length === 0 ? (
          <EmptyRoutes />
        ) : (
          <>
            <ul className="flex flex-col gap-2.5">
              {routes.map((r) => (
                <li key={r.extId}>
                  <RouteCard route={r} />
                </li>
              ))}
            </ul>
            {routesQuery.hasNextPage ? (
              <div className="mx-auto w-full max-w-xs">
                <SecondaryButton
                  onClick={() => {
                    void routesQuery.fetchNextPage();
                  }}
                  disabled={routesQuery.isFetchingNextPage}
                >
                  {routesQuery.isFetchingNextPage
                    ? t('common.loading')
                    : t('gym.detail.loadMore')}
                </SecondaryButton>
              </div>
            ) : null}
          </>
        )}
      </section>

      <div className="mt-2">
        <Link
          href={startSessionHref}
          aria-label={t('gym.detail.startSessionCta')}
          className="inline-flex h-14 w-full items-center justify-center rounded-lg bg-accent text-title font-bold text-accent-on transition-transform duration-fast ease-standard active:scale-[0.98]"
        >
          <span className="inline-flex items-center gap-2">
            <CrimpIcon.play s={18} />
            {t('gym.detail.startSessionCta')}
          </span>
        </Link>
      </div>
    </main>
  );
}

function MetaCard({ gym }: { gym: GymDetail }): JSX.Element {
  const hours = prettyJson(gym.openingHoursJson);
  const features = prettyJson(gym.featuresJson);

  return (
    <section
      aria-label={t('gym.detail.metaCardTitle')}
      className="flex flex-col gap-4 rounded-2xl bg-subtle p-6 shadow-xs"
    >
      {gym.phone ? (
        <MetaRow label={t('gym.detail.phoneLabel')} value={gym.phone} />
      ) : null}
      {hours ? (
        <MetaRow
          label={t('gym.detail.hoursLabel')}
          value={
            <pre className="whitespace-pre-wrap break-words font-mono text-caption text-text-2">
              {hours}
            </pre>
          }
        />
      ) : null}
      {gym.settingCycleDays != null ? (
        <MetaRow
          label={t('gym.detail.cycleLabel')}
          value={t('gym.detail.cycleValue').replace(
            '{{days}}',
            String(gym.settingCycleDays),
          )}
        />
      ) : null}
      {features ? (
        <MetaRow
          label={t('gym.detail.featuresLabel')}
          value={
            <pre className="whitespace-pre-wrap break-words font-mono text-caption text-text-2">
              {features}
            </pre>
          }
        />
      ) : null}
    </section>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-caption font-semibold text-text-3">{label}</p>
      {typeof value === 'string' ? (
        <p className="text-body font-medium text-text">{value}</p>
      ) : (
        value
      )}
    </div>
  );
}

/**
 * 백엔드는 openingHoursJson / featuresJson 을 텍스트 필드로 돌려준다.
 * 이 문자열이 유효한 JSON 이면 pretty-print, 아니면 원문을 그대로 반환.
 * 공백·null 은 null 로 정리.
 */
function prettyJson(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return trimmed;
  }
}

function RouteCard({ route }: { route: RouteItem }): JSX.Element {
  const gradeLabel = route.gradeValue ?? '—';
  const name = route.name ?? gradeLabel;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-subtle p-4 shadow-xs">
      <HoldDotSafe color={route.color} />
      <GradeBadge v={gradeLabel} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body font-bold text-text">{name}</p>
        <p className="truncate text-caption font-medium text-text-3">
          {formatRouteMeta(route)}
        </p>
      </div>
    </div>
  );
}

/**
 * 백엔드 `color` 는 "red"/"blue"/... 키 문자열. 알 수 없는 값이면 중립 회색으로 대체.
 */
function HoldDotSafe({ color }: { color: string | null | undefined }): JSX.Element {
  if (color && color in colors.hold) {
    return <HoldDot color={color as HoldColorKey} size={14} />;
  }
  return <HoldDot color="gray" size={14} />;
}

function formatRouteMeta(route: RouteItem): string {
  const parts: string[] = [];
  if (route.setter) {
    parts.push(`${t('gym.detail.routeSetterLabel')} ${route.setter}`);
  }
  if (route.setAt) {
    parts.push(`${t('gym.detail.routeSetAtLabel')} ${formatSetAt(route.setAt)}`);
  }
  return parts.join(' · ');
}

function formatSetAt(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function AuthRequiredCard(): JSX.Element {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-subtle px-6 py-10 text-center shadow-xs"
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-subtle px-6 py-10 text-center shadow-xs">
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
          className="flex items-center gap-3 rounded-2xl bg-subtle p-4 shadow-xs"
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

function DetailSkeleton(): JSX.Element {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-bg px-6 py-10"
    >
      <Skeleton h={36} w="60%" />
      <Skeleton h={16} w="80%" />
      <Skeleton h={180} r={20} />
      <Skeleton h={24} w="30%" />
      <Skeleton h={72} r={20} />
      <Skeleton h={72} r={20} />
    </main>
  );
}

function ErrorCard({
  title,
  message,
}: {
  title: string;
  message: string;
}): JSX.Element {
  return (
    <div role="alert" className="rounded-2xl bg-subtle p-5 shadow-xs">
      <p className="text-title font-bold text-danger">{title}</p>
      <p className="mt-1 text-body text-text-2">{message}</p>
    </div>
  );
}

