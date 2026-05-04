'use client';

import Link from 'next/link';

import { CrimpIcon } from '@/components/primitives';
import type { GymDetail } from '@/lib/schemas/gym';

export function GymHero({ gym }: { gym: GymDetail }): JSX.Element {
  return (
    <section className="relative h-[300px] overflow-hidden bg-accent-soft sm:rounded-2xl">
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg/80 to-transparent" />
      <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[32px] bg-accent text-[72px] font-extrabold leading-none text-text shadow-sm">
        {gym.name.trim().charAt(0)}
      </div>
      <div className="absolute bottom-8 left-5 right-5 text-center">
        <p className="truncate text-h2 font-extrabold text-text">{gym.name}</p>
        {gym.brand ? (
          <p className="mt-1 text-caption font-bold text-text-3">{gym.brand}</p>
        ) : null}
      </div>
      <div className="absolute left-5 right-5 top-12 flex items-center justify-between">
        <Link
          href="/gyms"
          aria-label="암장 목록으로 돌아가기"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-bg/95 text-text shadow-xs"
        >
          <CrimpIcon.chevL s={24} />
        </Link>
        <div className="flex gap-3">
          <button
            type="button"
            aria-label="찜"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-bg/95 text-text shadow-xs"
          >
            <CrimpIcon.heart s={24} />
          </button>
          <button
            type="button"
            aria-label="메뉴"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-bg/95 text-text shadow-xs"
          >
            <CrimpIcon.dots s={22} />
          </button>
        </div>
      </div>
    </section>
  );
}
