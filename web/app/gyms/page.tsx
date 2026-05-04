'use client';

import { useEffect, useState } from 'react';

import { GymSearchView } from '@/components/gyms/search/GymSearchView';
import { useGymsQuery } from '@/hooks/useGyms';
import { toUserMessage } from '@/lib/api/errorMessage';
import type { GymItem } from '@/lib/schemas/gym';

export default function GymsPage(): JSX.Element {
  const [inputQ, setInputQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [brand, setBrand] = useState<string | null>(null);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedQ(inputQ), 300);
    return () => clearTimeout(h);
  }, [inputQ]);

  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGymsQuery({ q: debouncedQ, brand }, 20);

  const items: GymItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <GymSearchView
      inputQ={inputQ}
      selectedBrand={brand}
      items={items}
      isLoading={isLoading}
      errorMessage={error ? toUserMessage(error) : null}
      hasNextPage={Boolean(hasNextPage)}
      isFetchingNextPage={isFetchingNextPage}
      onInputChange={setInputQ}
      onClearInput={() => setInputQ('')}
      onBrandSelect={(next) => setBrand(next === brand ? null : next)}
      onResetFilters={() => {
        setInputQ('');
        setDebouncedQ('');
        setBrand(null);
      }}
      onLoadMore={() => {
        void fetchNextPage();
      }}
    />
  );
}
