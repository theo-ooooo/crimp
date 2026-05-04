'use client';

import { Skeleton } from '@/components/primitives';

export function DetailSkeleton(): JSX.Element {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-bg px-6 py-10"
    >
      <Skeleton h={320} r={20} />
      <Skeleton h={46} w="70%" />
      <Skeleton h={90} r={16} />
      <Skeleton h={180} r={16} />
      <Skeleton h={72} r={16} />
      <Skeleton h={72} r={16} />
    </main>
  );
}

export function ErrorCard({
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
