import { SecondaryButton, Skeleton } from '@/components/primitives';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';

import { GymSearchRow } from './GymSearchRow';

export function GymSearchResults({
  gyms,
  isLoading,
  isFetchingNext,
  error,
  hasMore,
  onSelectGym,
  onLoadMore,
}: {
  gyms: GymItem[];
  isLoading: boolean;
  isFetchingNext: boolean;
  error: Error | null;
  hasMore: boolean;
  onSelectGym: (gym: GymItem) => void;
  onLoadMore: () => void;
}): JSX.Element {
  if (isLoading) {
    return (
      <div className="mt-4 flex flex-col gap-2" aria-busy="true">
        <Skeleton h={64} r={12} />
        <Skeleton h={64} r={12} />
        <Skeleton h={64} r={12} />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="mt-4 rounded-xl bg-bg p-4">
        <p className="text-body font-extrabold text-danger">
          {t('session.start.searchErrorTitle')}
        </p>
        <p className="mt-1 text-caption font-semibold text-text-3">
          {toUserMessage(error)}
        </p>
      </div>
    );
  }

  if (gyms.length === 0) {
    return (
      <div className="mt-4 rounded-xl bg-bg p-4">
        <p className="text-body font-extrabold text-text">
          {t('session.start.searchEmptyTitle')}
        </p>
        <p className="mt-1 text-caption font-semibold text-text-3">
          {t('session.start.searchEmptyBody')}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {gyms.map((gym) => (
        <GymSearchRow key={gym.extId} gym={gym} onSelectGym={onSelectGym} />
      ))}
      {hasMore ? (
        <SecondaryButton
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingNext}
          className="h-11 text-body"
        >
          {isFetchingNext ? t('common.loading') : t('session.start.loadMore')}
        </SecondaryButton>
      ) : null}
    </div>
  );
}
