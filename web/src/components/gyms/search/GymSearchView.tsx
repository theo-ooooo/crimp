'use client';

import { SecondaryButton } from '@/components/primitives';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';

import { SearchContent } from './SearchContent';
import { SearchHeader } from './SearchHeader';

interface GymSearchViewProps {
  inputQ: string;
  selectedBrand: string | null;
  items: GymItem[];
  isLoading: boolean;
  errorMessage: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onInputChange: (value: string) => void;
  onClearInput: () => void;
  onBrandSelect: (brand: string | null) => void;
  onResetFilters: () => void;
  onLoadMore: () => void;
}

export function GymSearchView({
  inputQ,
  selectedBrand,
  items,
  isLoading,
  errorMessage,
  hasNextPage,
  isFetchingNextPage,
  onInputChange,
  onClearInput,
  onBrandSelect,
  onResetFilters,
  onLoadMore,
}: GymSearchViewProps): JSX.Element {
  const featured = items.slice(0, 4);
  const hasFilter = inputQ.trim() !== '' || selectedBrand !== null;

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-5 pb-24 pt-8 sm:max-w-5xl sm:px-8 sm:pb-16">
        <SearchHeader
          resultCount={items.length}
          inputQ={inputQ}
          selectedBrand={selectedBrand}
          hasFilter={hasFilter}
          onInputChange={onInputChange}
          onClearInput={onClearInput}
          onBrandSelect={onBrandSelect}
          onResetFilters={onResetFilters}
        />

        <SearchContent
          items={items}
          featured={featured}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />

        {hasNextPage ? (
          <div className="mx-auto w-full max-w-xs">
            <SecondaryButton onClick={onLoadMore} disabled={isFetchingNextPage}>
              {isFetchingNextPage
                ? t('common.loading')
                : t('gym.list.loadMore')}
            </SecondaryButton>
          </div>
        ) : null}
      </div>
    </main>
  );
}
