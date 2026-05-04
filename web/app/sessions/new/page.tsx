'use client';

import { Suspense } from 'react';

import { NewSessionContent } from '@/components/sessions/start/NewSessionContent';
import { NewSessionSkeleton } from '@/components/sessions/start/NewSessionSkeleton';

export default function NewSessionPage(): JSX.Element {
  return (
    <Suspense fallback={<NewSessionSkeleton />}>
      <NewSessionContent />
    </Suspense>
  );
}
