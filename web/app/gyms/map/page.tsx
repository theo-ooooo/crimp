'use client';

import { GymMapView } from '@/components/gyms/map/GymMapView';
import { useGymsQuery } from '@/hooks/useGyms';
import { toUserMessage } from '@/lib/api/errorMessage';
import type { GymItem } from '@/lib/schemas/gym';

export default function GymMapPage(): JSX.Element {
  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGymsQuery({}, 100);

  const gyms: GymItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <GymMapView
      gyms={gyms}
      isLoading={isLoading}
      errorMessage={error ? toUserMessage(error) : null}
      hasNextPage={Boolean(hasNextPage)}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => {
        void fetchNextPage();
      }}
    />
  );
}
