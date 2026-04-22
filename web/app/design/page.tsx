/**
 * `/design` — 프리미티브 컴포넌트 쇼케이스 페이지.
 * 네비게이션에 노출하지 않는 디자이너·개발자용 내부 페이지.
 * 사용자용 카피는 아니므로 한국어 원문 그대로 사용.
 */

'use client';

import { useState } from 'react';

import {
  BigStat,
  Chip,
  CrimpIcon,
  GradeBadge,
  HoldDot,
  type HoldColorKey,
  PrimaryButton,
  ResultMark,
  type ResultKind,
  SecondaryButton,
  Skeleton,
} from '@/components/primitives';

const HOLD_COLORS: HoldColorKey[] = [
  'red',
  'blue',
  'yellow',
  'green',
  'white',
  'black',
  'pink',
  'orange',
  'purple',
  'gray',
];

const RESULTS: ResultKind[] = ['SEND', 'FLASH', 'ONSIGHT', 'TRY', 'FAIL'];

const GRADES = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10'];

const ICON_NAMES = [
  'bell',
  'search',
  'plus',
  'chevR',
  'chevL',
  'close',
  'home',
  'map',
  'feed',
  'profile',
  'clock',
  'pin',
  'play',
  'flame',
  'check',
  'filter',
  'trend',
  'dots',
  'target',
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-hairline pb-10 mb-10 last:border-b-0">
      <h2 className="text-h2 font-bold mb-5 tracking-[-0.03em]">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignPrimitivesPage() {
  const [chipStates, setChipStates] = useState<Record<string, boolean>>({
    볼더링: true,
    리드: false,
    스피드: false,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <p className="text-caption uppercase tracking-[0.3em] text-accent font-semibold">
          Crimp Primitives
        </p>
        <h1 className="mt-2 text-h1 font-extrabold tracking-[-0.04em]">
          Crimp — Design Primitives
        </h1>
        <p className="mt-3 text-body text-text-2">
          웹 공용 프리미티브 컴포넌트 쇼케이스. 네비게이션 미노출.
        </p>
      </header>

      <Section title="Button">
        <div className="flex flex-col gap-3 max-w-sm">
          <PrimaryButton onClick={() => console.log('primary')}>세션 시작하기</PrimaryButton>
          <PrimaryButton disabled>비활성화 상태</PrimaryButton>
          <SecondaryButton>취소</SecondaryButton>
          <SecondaryButton disabled>비활성 보조</SecondaryButton>
        </div>
      </Section>

      <Section title="Chip">
        <div className="flex flex-wrap gap-2">
          {Object.keys(chipStates).map((label) => (
            <Chip
              key={label}
              active={chipStates[label]}
              onClick={() =>
                setChipStates((s) => ({ ...s, [label]: !s[label] }))
              }
            >
              {label}
            </Chip>
          ))}
          <Chip icon={<CrimpIcon.filter s={14} />}>필터</Chip>
          <Chip icon={<CrimpIcon.flame s={14} />} active>
            인기
          </Chip>
        </div>
      </Section>

      <Section title="GradeBadge">
        <div className="space-y-3">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-2">
              <span className="w-8 text-caption text-text-3">{size}</span>
              {GRADES.map((v) => (
                <GradeBadge key={v} v={v} size={size} />
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section title="ResultMark">
        <div className="flex flex-wrap items-center gap-6">
          {RESULTS.map((kind) => (
            <div key={kind} className="flex flex-col items-center gap-1">
              <ResultMark kind={kind} size={36} />
              <span className="text-caption text-text-2">{kind}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="HoldDot">
        <div className="flex flex-wrap items-center gap-4">
          {HOLD_COLORS.map((c) => (
            <div key={c} className="flex flex-col items-center gap-1">
              <HoldDot color={c} size={20} label={c} />
              <span className="text-caption text-text-2">{c}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1">
            <HoldDot color="#FF7043" size={20} />
            <span className="text-caption text-text-2">#FF7043</span>
          </div>
        </div>
      </Section>

      <Section title="BigStat">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <BigStat label="이번 주 완등" value={12} unit="회" scale="lg" />
          <BigStat label="총 세션" value={248} unit="회" scale="md" align="left" />
          <BigStat
            label="최고 그레이드"
            value="V7"
            scale="xl"
            align="center"
            accent="var(--color-accent)"
          />
          <BigStat label="이번 달 시도" value="1,204" scale="sm" />
        </div>
      </Section>

      <Section title="Skeleton">
        <div className="flex flex-col gap-2 max-w-sm">
          <Skeleton h={20} w="60%" />
          <Skeleton h={14} />
          <Skeleton h={14} w="85%" />
          <div className="flex gap-3 mt-4 items-center">
            <Skeleton w={48} h={48} r={24} />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton h={14} w="40%" />
              <Skeleton h={12} w="70%" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Icon">
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
          {ICON_NAMES.map((name) => {
            const Cmp = CrimpIcon[name];
            return (
              <div
                key={name}
                className="flex flex-col items-center gap-1 p-3 rounded-lg bg-subtle"
              >
                <Cmp s={24} />
                <span className="text-caption text-text-2">{name}</span>
              </div>
            );
          })}
        </div>
      </Section>
    </main>
  );
}
