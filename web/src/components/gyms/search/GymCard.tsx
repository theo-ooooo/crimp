'use client';

import Link from 'next/link';

import { CrimpIcon } from '@/components/primitives';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';

export function GymCard({ gym }: { gym: GymItem }): JSX.Element {
  return (
    <Link
      href={`/gyms/${encodeURIComponent(gym.extId)}`}
      className="flex min-h-[104px] items-center gap-4 rounded-xl border border-hairline bg-subtle p-4 shadow-xs transition-transform duration-fast ease-standard hover:shadow-sm active:scale-[0.99]"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-h2 font-extrabold text-text">
        {gym.name.trim().charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-title font-extrabold text-text">
            {gym.name}
          </p>
          <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-caption font-extrabold text-emerald-600">
            영업중
          </span>
        </div>
        <p className="mt-1 truncate text-body font-medium text-text-3">
          {gym.address ?? t('gym.list.addressFallback')}
          {gym.distanceMeters != null ? ` · ${formatDistance(gym.distanceMeters)}` : ''}
        </p>
        <p className="mt-1 truncate text-caption font-bold text-text-2">
          {formatRating(gym.rating)}
          {gym.monthlyUserCount > 0 ? ` · ${gym.monthlyUserCount}명 다녀감` : ''}
        </p>
      </div>
      <CrimpIcon.chevR s={18} className="shrink-0 text-text-4" />
    </Link>
  );
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatRating(value: GymItem['rating']): string {
  if (value == null) return '평점 없음';
  return `★ ${Number(value).toFixed(1)}`;
}
