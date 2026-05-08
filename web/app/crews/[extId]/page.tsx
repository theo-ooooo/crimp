'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useParams } from 'next/navigation';

import {
  CrimpIcon,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
} from '@/components/primitives';
import {
  useCancelMyCrewJoinRequest,
  useCrewQuery,
  useRequestCrewJoin,
} from '@/hooks/useCrews';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { toUserMessage } from '@/lib/api/errorMessage';
import type {
  CrewDetail,
  CrewLevelBand,
  CrewMyStatus,
  CrewStyle,
} from '@/lib/schemas/crew';

export default function CrewDetailPage(): JSX.Element {
  const params = useParams<{ extId: string }>();
  const extId = params?.extId ?? null;
  const accessToken = useRequireAuth();
  const crewQuery = useCrewQuery(accessToken, extId);
  const requestJoin = useRequestCrewJoin(accessToken);
  const cancelJoin = useCancelMyCrewJoinRequest(accessToken);

  if (!accessToken || !extId) return <DetailSkeleton />;

  if (crewQuery.isLoading) return <DetailSkeleton />;

  if (crewQuery.error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-bg px-5 py-10">
        <BackLink />
        <StateCard
          title="크루를 불러오지 못했습니다"
          body={toUserMessage(crewQuery.error)}
        />
      </main>
    );
  }

  const crew = crewQuery.data;
  if (!crew) return <DetailSkeleton />;

  const pending = requestJoin.isPending || cancelJoin.isPending;
  const mutationError = requestJoin.error ?? cancelJoin.error;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-bg px-5 pb-[calc(80px+env(safe-area-inset-bottom))] pt-8 md:pb-12">
      <BackLink />

      <header className="rounded-3xl bg-subtle p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={crew.myStatus} />
          <span className="rounded-full bg-chip px-3 py-1 text-caption font-bold text-text-2">
            {joinPolicyLabel(crew.joinPolicy)}
          </span>
        </div>
        <h1 className="mt-4 text-[30px] font-extrabold leading-tight tracking-[-0.04em] text-text">
          {crew.name}
        </h1>
        <p className="mt-2 text-body font-semibold text-text-2">
          {crew.summary ?? '소개가 아직 없습니다.'}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="멤버" value={`${crew.memberCount}${crew.capacity ? ` / ${crew.capacity}` : ''}`} />
          <Stat label="오너" value={crew.owner.nickname ?? '크림퍼'} />
        </dl>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-bg p-4">
        <h2 className="text-title font-extrabold text-text">기본 정보</h2>
        <div className="flex flex-wrap gap-2">
          <MetaChip label={crew.region ?? '지역 미설정'} />
          <MetaChip label={crew.homeGym?.name ?? '대표 암장 없음'} />
          <MetaChip label={levelLabel(crew.levelBand)} />
          <MetaChip label={styleLabel(crew.style)} />
        </div>
        {crew.description ? (
          <p className="whitespace-pre-wrap text-body font-medium leading-relaxed text-text-2">
            {crew.description}
          </p>
        ) : (
          <p className="text-body font-medium text-text-3">
            아직 자세한 소개가 없습니다.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-bg p-4">
        <h2 className="text-title font-extrabold text-text">가입</h2>
        <p className="text-body font-medium text-text-2">
          승인제 크루입니다. 요청을 보내면 크루장 또는 관리자가 확인합니다.
        </p>
        <JoinAction
          status={crew.myStatus}
          disabled={pending}
          onRequest={() => {
            requestJoin.mutate({ crewExtId: crew.extId, body: { message: null } });
          }}
          onCancel={() => {
            cancelJoin.mutate(crew.extId);
          }}
        />
        {mutationError ? (
          <p role="alert" className="text-caption font-semibold text-danger">
            {toUserMessage(mutationError)}
          </p>
        ) : null}
      </section>
    </main>
  );
}

function BackLink(): JSX.Element {
  return (
    <Link
      href={'/crews' as Route}
      className="inline-flex w-fit items-center gap-1 text-body font-bold text-text-2 transition-colors duration-fast ease-standard hover:text-text"
    >
      <CrimpIcon.chevL s={18} />
      크루 목록
    </Link>
  );
}

function JoinAction({
  status,
  disabled,
  onRequest,
  onCancel,
}: {
  status: CrewMyStatus;
  disabled: boolean;
  onRequest: () => void;
  onCancel: () => void;
}): JSX.Element {
  if (status === 'PENDING') {
    return (
      <SecondaryButton onClick={onCancel} disabled={disabled}>
        {disabled ? '처리 중...' : '가입 요청 취소'}
      </SecondaryButton>
    );
  }
  if (status === 'MEMBER' || status === 'OWNER' || status === 'ADMIN') {
    return <SecondaryButton disabled>이미 가입한 크루</SecondaryButton>;
  }
  return (
    <PrimaryButton onClick={onRequest} disabled={disabled}>
      {disabled ? '요청 중...' : '가입 요청'}
    </PrimaryButton>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-2xl bg-bg p-4">
      <dt className="text-caption font-bold text-text-3">{label}</dt>
      <dd className="mt-1 truncate text-title font-extrabold text-text">{value}</dd>
    </div>
  );
}

function MetaChip({ label }: { label: string }): JSX.Element {
  return (
    <span className="rounded-full bg-chip px-3 py-1 text-caption font-bold text-text-2">
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: CrewMyStatus }): JSX.Element {
  const label: Record<CrewMyStatus, string> = {
    NONE: '미가입',
    PENDING: '요청 대기',
    MEMBER: '멤버',
    OWNER: '오너',
    ADMIN: '관리자',
  };
  return (
    <span className="rounded-full bg-accent-soft px-3 py-1 text-caption font-extrabold text-accent-ink">
      {label[status]}
    </span>
  );
}

function DetailSkeleton(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-bg px-5 py-10">
      <Skeleton h={22} w="28%" />
      <Skeleton h={220} r={24} />
      <Skeleton h={150} r={20} />
      <Skeleton h={150} r={20} />
    </main>
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

function joinPolicyLabel(v: CrewDetail['joinPolicy']): string {
  return {
    APPROVAL: '승인제',
    OPEN: '즉시 가입',
    INVITE_ONLY: '초대 전용',
  }[v];
}
