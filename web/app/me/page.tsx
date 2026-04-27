'use client';

import { useRouter } from 'next/navigation';

import { CrimpIcon, SecondaryButton, Skeleton } from '@/components/primitives';
import { MainGymSection } from '@/components/me/MainGymSection';
import { useLogout } from '@/hooks/useAuth';
import { useMeQuery } from '@/hooks/useMe';
import { useMeStatsQuery } from '@/hooks/useMeStats';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { Me } from '@/lib/schemas/me';
import type { MeStats } from '@/lib/schemas/meStats';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * `/me` — 내 프로필.
 *
 * 디자인 (`docs/design/claude/v2/screens-ios-2.jsx:384-477` ProfileScreen — restrained):
 * - 헤더: 72x72 그라데이션 아바타 + 22px 닉네임 + 13px 레벨/소개 caption
 * - 통계 strip: 22px gap 으로 "184 완등 / 47 세션 / 62 친구" — 친구는 Phase 2, 본 PR 은
 *   me/stats 의 totalSends, totalSessions, topGrade 로 매핑
 * - hero 카드 (최고 그레이드): bg-subtle / rounded-xl(20) / 80px accent grade + caption
 * - 내 암장: 기존 PR #60 의 MainGymSection 유지
 * - 그레이드 분포 / 배지: 데이터 미구현 → 본 PR 에서 skip (후속 PR)
 *
 * 인증/hydration 가드는 기존과 동일.
 */
export default function MePage(): JSX.Element {
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();

  if (!hydrated) {
    return <HydrationGate />;
  }

  if (!accessToken) {
    return <LoginRequired />;
  }

  return <Loaded accessToken={accessToken} />;
}

function HydrationGate(): JSX.Element {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-bg px-5 py-10"
    >
      <Skeleton h={16} w="20%" />
      <div className="flex items-center gap-4">
        <Skeleton h={72} w={72} r={36} />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton h={24} w="40%" />
          <Skeleton h={14} w="60%" />
        </div>
      </div>
      <Skeleton h={140} r={20} />
      <Skeleton h={120} r={20} />
    </main>
  );
}

function LoginRequired(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 bg-bg px-5">
      <h1 className="text-h1 font-extrabold text-text">
        {t('me.loginRequiredTitle')}
      </h1>
      <p className="text-body text-text-2">
        {t('me.loginRequiredDescription')}
      </p>
    </main>
  );
}

function Loaded({ accessToken }: { accessToken: string }): JSX.Element {
  const meQuery = useMeQuery(accessToken);
  const statsQuery = useMeStatsQuery(accessToken);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-7 bg-bg px-5 py-10">
      {/* eyebrow — 작은 caption 라벨로 페이지 컨텍스트 표시 */}
      <p className="px-1 text-caption font-bold uppercase tracking-[0.2em] text-text-3">
        {t('me.eyebrow')}
      </p>

      {/* 헤더: 아바타 + 닉네임 + 레벨/소개 */}
      {meQuery.isLoading ? (
        <ProfileHeaderSkeleton />
      ) : meQuery.error ? (
        <ErrorCard
          title={t('me.errorTitle')}
          message={toUserMessage(meQuery.error)}
        />
      ) : meQuery.data ? (
        <ProfileHeader me={meQuery.data} />
      ) : null}

      {/* 통계 strip — 184/47/V6 형태 */}
      {statsQuery.isLoading ? (
        <StatsStripSkeleton />
      ) : statsQuery.error ? (
        <ErrorCard
          title={t('me.statsErrorTitle')}
          message={toUserMessage(statsQuery.error)}
        />
      ) : statsQuery.data ? (
        <StatsStrip stats={statsQuery.data} />
      ) : null}

      {/* hero — 최고 그레이드 큰 숫자 */}
      {statsQuery.isLoading ? (
        <Skeleton h={140} r={20} />
      ) : statsQuery.data ? (
        <TopGradeHero stats={statsQuery.data} />
      ) : null}

      {/* 내 암장 — 기존 PR #60 유지 (행위 무변경) */}
      {meQuery.data ? (
        <MainGymSection
          accessToken={accessToken}
          currentMainGym={meQuery.data.mainGym ?? null}
        />
      ) : null}

      <LogoutSection />
    </main>
  );
}

/**
 * 로그아웃 섹션 — `/me` 마지막에 위치한 단일 버튼.
 *
 * - `useLogout` 가 서버 호출 후 `tokenStore.clear()` + `qc.clear()` 까지 처리하므로
 *   여기선 mutate 만 호출하고 settled 시 `/login` 으로 replace.
 * - 네트워크 실패해도 로컬 토큰은 정리되므로 결과와 무관하게 로그인 페이지로 이동.
 * - destructive 가 아니라 회복 가능한 액션이므로 별도 confirm 다이얼로그는 두지 않는다.
 */
function LogoutSection(): JSX.Element {
  const router = useRouter();
  const { mutate, isPending } = useLogout();

  const onClick = () => {
    mutate(undefined, {
      onSettled: () => {
        router.replace('/login');
      },
    });
  };

  return (
    <section className="px-1 pt-2">
      <SecondaryButton
        onClick={onClick}
        disabled={isPending}
        className="h-12 text-body"
      >
        {isPending ? t('me.logout.loading') : t('me.logout.cta')}
      </SecondaryButton>
    </section>
  );
}

/**
 * 프로필 헤더 — mock 의 72x72 그라데이션 아바타 + 닉네임 + 레벨/소개 caption.
 *
 * 아바타 미디어 ID 기반 이미지 렌더링은 후속 PR. 본 PR 은 닉네임 첫 글자 placeholder.
 */
function ProfileHeader({ me }: { me: Me }): JSX.Element {
  const nickname = me.nickname ?? t('me.nicknameFallback');
  const initial = nickname.trim().slice(0, 1) || 'C';

  // 레벨 · 소개 인라인 표시 — mock: "@minjun_climb · 클라이밍 2년차"
  const levelLabel =
    me.levelSelf !== null && me.levelSelf >= 0
      ? t('me.levelDisplay').replace('{{level}}', String(me.levelSelf))
      : t('me.levelFallback');
  const bioLabel = me.bio ?? t('me.bioFallback');

  return (
    <header className="flex items-center gap-4 px-1">
      <div
        aria-hidden="true"
        className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[36px] text-[28px] font-extrabold tracking-[-0.04em] text-white"
        style={{
          background:
            'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-ink) 100%)',
        }}
      >
        {initial}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="truncate text-[22px] font-extrabold tracking-[-0.03em] text-text">
          {nickname}
        </h1>
        <p className="truncate text-caption font-medium text-text-3">
          {levelLabel} · {bioLabel}
        </p>
      </div>
    </header>
  );
}

function ProfileHeaderSkeleton(): JSX.Element {
  return (
    <div className="flex items-center gap-4 px-1">
      <Skeleton h={72} w={72} r={36} />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton h={24} w="40%" />
        <Skeleton h={14} w="60%" />
      </div>
    </div>
  );
}

/**
 * 통계 strip — mock 의 친구 바를 me/stats 데이터에 매핑.
 * - 완등 = totalSends, 세션 = totalSessions, 최고 = topGrade
 * - 친구 카운트는 Phase 2 도메인이라 미노출 (후속 PR)
 */
function StatsStrip({ stats }: { stats: MeStats }): JSX.Element {
  const topGrade = stats.topGrade ?? t('common.empty');
  return (
    <div className="flex items-center gap-6 px-1">
      <StatItem
        value={String(stats.totalSends)}
        label={t('me.statsTotalSends')}
      />
      <StatItem
        value={String(stats.totalSessions)}
        label={t('me.statsTotalSessions')}
      />
      <StatItem value={topGrade} label={t('me.statsTopGrade')} />
    </div>
  );
}

function StatItem({
  value,
  label,
}: {
  value: string;
  label: string;
}): JSX.Element {
  return (
    <div className="flex items-baseline gap-1.5 text-body">
      <span className="font-extrabold tabular-nums text-text">{value}</span>
      <span className="font-semibold text-text-3">{label}</span>
    </div>
  );
}

function StatsStripSkeleton(): JSX.Element {
  return (
    <div className="flex items-center gap-6 px-1">
      <Skeleton h={20} w={64} />
      <Skeleton h={20} w={64} />
      <Skeleton h={20} w={64} />
    </div>
  );
}

/**
 * 최고 그레이드 hero 카드 — mock `screens-ios-2.jsx:415-427`.
 *
 * - bg-subtle / rounded-xl(20) / 22x22 padding
 * - 12px caption 라벨 + 80px accent 큰 숫자
 * - topGrade 가 null 이면 "기록 없음" + 안내 caption
 */
function TopGradeHero({ stats }: { stats: MeStats }): JSX.Element {
  const hasGrade = stats.topGrade !== null;
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-subtle p-[22px] shadow-xs">
      <p className="text-caption font-bold tracking-[-0.01em] text-text-3">
        {t('me.heroTopGradeLabel')}
      </p>
      <div className="flex items-baseline gap-4">
        <p
          className="font-extrabold tabular-nums tracking-[-0.06em] text-accent-ink"
          style={{ fontSize: 80, lineHeight: 0.9 }}
        >
          {hasGrade ? stats.topGrade : t('me.heroTopGradeEmpty')}
        </p>
        {hasGrade ? (
          <div className="flex flex-col gap-1">
            <p className="inline-flex items-center gap-1 text-caption font-bold text-success">
              <CrimpIcon.trend s={14} />
              {t('me.statsTopGrade')}
            </p>
          </div>
        ) : (
          <p className="text-caption font-medium text-text-3">
            {t('me.heroTopGradeHint')}
          </p>
        )}
      </div>
    </section>
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
