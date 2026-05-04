'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useStartSessionForm } from '@/hooks/useStartSessionForm';

import { NewSessionSkeleton } from './NewSessionSkeleton';
import { StartSessionView } from './StartSessionView';
import type { StartSessionGymChoice } from './types';

export function NewSessionContent(): JSX.Element {
  const accessToken = useRequireAuth();
  const searchParams = useSearchParams();
  const routeGym = useMemo<StartSessionGymChoice | null>(() => {
    const extId = searchParams?.get('gymExtId') ?? null;
    const name = searchParams?.get('gymName') ?? null;
    return extId && name ? { extId, name } : null;
  }, [searchParams]);
  const form = useStartSessionForm(accessToken, routeGym);

  if (!accessToken) return <NewSessionSkeleton />;

  return <StartSessionView {...form} />;
}
