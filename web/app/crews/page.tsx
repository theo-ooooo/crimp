'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';

import {
  CrimpIcon,
  SecondaryButton,
  Skeleton,
} from '@/components/primitives';
import { useCrewsQuery } from '@/hooks/useCrews';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { toUserMessage } from '@/lib/api/errorMessage';
import type {
  CrewItem,
  CrewLevelBand,
  CrewMyStatus,
  CrewStyle,
} from '@/lib/schemas/crew';

const LEVEL_OPTIONS: Array<{ value: CrewLevelBand; label: string }> = [
  { value: 'ALL', label: '레벨 무관' },
  { value: 'BEGINNER', label: '입문' },
  { value: 'INTERMEDIATE', label: '중급' },
  { value: 'ADVANCED', label: '고급' },
];

const STYLE_OPTIONS: Array<{ value: CrewStyle; label: string }> = [
  { value: 'BOULDERING', label: '볼더링' },
  { value: 'LEAD', label: '리드' },
  { value: 'BOTH', label: '둘 다' },
];

export default function CrewsPage(): JSX.Element {
  const accessToken = useRequireAuth();
  const [inputQ, setInputQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [region, setRegion] = useState('');
  const [levelBand, setLevelBand] = useState<CrewLevelBand | null>(null);
  const [style, setStyle] = useState<CrewStyle | null>(null);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedQ(inputQ), 250);
    return () => clearTimeout(h);
  }, [inputQ]);

  const query = useCrewsQuery(accessToken, {
    q: debouncedQ,
    region,
    levelBand,
    style,
  }, 20);

  if (!accessToken) return <HydrationGate />;

  const crews = query.data?.pages.flatMap((p) => p.items) ?? [];
  const hasFilters = Boolean(inputQ || region || levelBand || style);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-bg px-5 pb-[calc(80px+env(safe-area-inset-bottom))] pt-8 md:pb-12">
      <header className="flex flex-col gap-2">
        <p className="text-caption font-bold uppercase tracking-[0.2em] text-accent-ink">
          Crew
        </p>
        <h1 className="text-h1 font-extrabold tracking-[-0.04em] text-text">
          크루 찾기
        </h1>
        <p className="text-body font-medium text-text-3">
          지역, 레벨, 스타일이 맞는 등반 모임을 찾아보세요.
        </p>
      </header>

      <section aria-label="크루 필터" className="flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">크루 검색</span>
          <CrimpIcon.search
            s={19}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-3"
          />
          <input
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder="크루 이름, 소개로 검색"
            className="h-12 w-full rounded-xl border border-hairline bg-subtle py-0 pl-11 pr-4 text-body font-semibold text-text outline-none transition-colors placeholder:text-text-3 focus:border-accent"
          />
        </label>
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="지역 필터 예: 서울 강남"
          className="h-12 w-full rounded-xl border border-hairline bg-bg px-4 text-body font-semibold text-text outline-none transition-colors placeholder:text-text-3 focus:border-accent"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {LEVEL_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={levelBand === opt.value}
              onClick={() => setLevelBand(levelBand === opt.value ? null : opt.value)}
            />
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STYLE_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={style === opt.value}
              onClick={() => setStyle(style === opt.value ? null : opt.value)}
            />
          ))}
        </div>
      </section>

      {query.isLoading ? (
        <ListSkeleton />
      ) : query.error ? (
        <StateCard
          title="크루를 불러오지 못했습니다"
          body={toUserMessage(query.error)}
        />
      ) : crews.length === 0 ? (
        <StateCard
          title={hasFilters ? '조건에 맞는 크루가 없어요' : '아직 공개 크루가 없어요'}
          body={hasFilters
            ? '검색어와 필터를 조금 넓혀서 다시 확인해 주세요.'
            : '첫 크루를 만들어 베타 커뮤니티를 시작할 수 있어요.'}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {crews.map((crew) => (
            <li key={crew.extId}>
              <CrewCard crew={crew} />
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage ? (
        <SecondaryButton
          onClick={() => {
            void query.fetchNextPage();
          }}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? '불러오는 중...' : '더 보기'}
        </SecondaryButton>
      ) : null}
    </main>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-9 shrink-0 rounded-full px-4 text-caption font-bold transition-colors duration-fast ease-standard',
        active ? 'bg-accent text-white' : 'bg-chip text-text-2 hover:text-text',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function CrewCard({ crew }: { crew: CrewItem }): JSX.Element {
  return (
    <Link
      href={`/crews/${crew.extId}` as Route}
      className="block rounded-2xl border border-hairline bg-bg p-4 transition-transform duration-fast ease-standard hover:bg-subtle active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-title font-extrabold tracking-[-0.03em] text-text">
              {crew.name}
            </h2>
            <StatusBadge status={crew.myStatus} />
          </div>
          <p className="mt-1 line-clamp-2 text-body font-medium text-text-2">
            {crew.summary ?? '소개가 아직 없습니다.'}
          </p>
        </div>
        <CrimpIcon.chevR s={18} className="mt-1 shrink-0 text-text-3" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <MetaChip label={crew.region ?? '지역 미설정'} />
        <MetaChip label={crew.homeGym?.name ?? '대표 암장 없음'} />
        <MetaChip label={levelLabel(crew.levelBand)} />
        <MetaChip label={styleLabel(crew.style)} />
      </div>
      <p className="mt-3 text-caption font-semibold text-text-3 tabular-nums">
        멤버 {crew.memberCount}명{crew.capacity ? ` / ${crew.capacity}명` : ''}
      </p>
    </Link>
  );
}

function MetaChip({ label }: { label: string }): JSX.Element {
  return (
    <span className="rounded-full bg-chip px-3 py-1 text-caption font-bold text-text-2">
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: CrewMyStatus }): JSX.Element | null {
  if (status === 'NONE') return null;
  const label: Record<CrewMyStatus, string> = {
    NONE: '',
    PENDING: '대기 중',
    MEMBER: '멤버',
    OWNER: '오너',
    ADMIN: '관리자',
  };
  return (
    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-extrabold text-accent-ink">
      {label[status]}
    </span>
  );
}

function HydrationGate(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 bg-bg px-5">
      <Skeleton h={18} w="20%" />
      <Skeleton h={34} w="45%" />
      <Skeleton h={48} r={16} />
      <Skeleton h={110} r={20} />
      <Skeleton h={110} r={20} />
    </main>
  );
}

function ListSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton h={128} r={20} />
      <Skeleton h={128} r={20} />
      <Skeleton h={128} r={20} />
    </div>
  );
}

function StateCard({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <section className="rounded-2xl bg-subtle p-5">
      <p className="text-title font-extrabold text-text">{title}</p>
      <p className="mt-2 text-body font-medium text-text-2">{body}</p>
    </section>
  );
}

function levelLabel(v: CrewLevelBand): string {
  return {
    ALL: '모든 레벨',
    BEGINNER: '입문',
    INTERMEDIATE: '중급',
    ADVANCED: '고급',
  }[v];
}

function styleLabel(v: CrewStyle): string {
  return {
    BOULDERING: '볼더링',
    LEAD: '리드',
    BOTH: '볼더링 · 리드',
  }[v];
}
