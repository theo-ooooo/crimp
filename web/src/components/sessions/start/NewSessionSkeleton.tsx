import { Skeleton } from '@/components/primitives';

export function NewSessionSkeleton(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 bg-bg px-6">
      <Skeleton h={32} w="40%" />
      <Skeleton h={16} w="60%" />
    </main>
  );
}
