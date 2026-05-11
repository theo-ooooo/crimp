'use client';

import { CrimpIcon, Skeleton } from '@/components/primitives';
import { t } from '@/lib/i18n';

export function SearchSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <Skeleton h={188} r={16} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl bg-subtle p-4">
          <Skeleton h={64} w={64} r={16} />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton h={18} w="55%" />
            <Skeleton h={14} w="78%" />
            <Skeleton h={12} w="35%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchErrorCard({
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

export function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-subtle px-6 py-14 text-center shadow-xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg text-text-3">
        <CrimpIcon.search s={28} />
      </div>
      <p className="text-body font-semibold text-text-2">
        {t('gym.list.empty')}
      </p>
    </div>
  );
}
