import { CrimpIcon } from '@/components/primitives';
import { t } from '@/lib/i18n';

import { GymSearchResults } from './GymSearchResults';
import { SelectedGymCard } from './SelectedGymCard';
import type {
  StartSessionGymActions,
  StartSessionGymChoiceModel,
  StartSessionGymSearchModel,
} from './types';

export function GymChoiceSection({
  choice,
  search,
  actions,
}: {
  choice: StartSessionGymChoiceModel;
  search: StartSessionGymSearchModel;
  actions: StartSessionGymActions;
}): JSX.Element {
  if (choice.mode === 'selected' && choice.activeGym) {
    return (
      <SelectedGymCard
        gym={choice.activeGym}
        onChange={
          choice.mainGym && choice.activeGym.extId !== choice.mainGym.extId
            ? actions.onClearSelectedGym
            : actions.onUseOtherGym
        }
      />
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-label={t('session.start.gymNameLabel')}>
      {choice.mainGym ? (
        <button
          type="button"
          onClick={actions.onUseMainGym}
          className="flex items-center justify-between gap-3 rounded-2xl bg-subtle p-4 text-left shadow-xs transition-transform duration-fast ease-standard active:scale-[0.99]"
        >
          <span className="min-w-0">
            <span className="block text-caption font-semibold text-text-3">
              {t('session.start.mainGymLabel')}
            </span>
            <span className="mt-1 block truncate text-body font-extrabold text-text">
              {choice.mainGym.name}
            </span>
          </span>
          <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-bg px-3 text-caption font-extrabold text-text">
            {t('session.start.useMainGymCta')}
          </span>
        </button>
      ) : null}

      <div className="rounded-2xl bg-subtle p-4 shadow-xs">
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-4 text-text-3">
            <CrimpIcon.search s={18} />
          </span>
          <input
            type="search"
            value={search.searchText}
            onChange={(e) => actions.onSearchTextChange(e.target.value)}
            placeholder={t('session.start.searchPlaceholder')}
            aria-label={t('session.start.searchPlaceholder')}
            className="h-12 w-full rounded-lg bg-bg pl-11 pr-11 text-body font-medium text-text placeholder:text-text-3 focus:outline focus:outline-2 focus:outline-accent"
          />
          {search.searchText ? (
            <button
              type="button"
              aria-label={t('session.start.clearSearch')}
              onClick={() => actions.onSearchTextChange('')}
              className="absolute right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-3 hover:bg-subtle hover:text-text"
            >
              <CrimpIcon.close s={18} />
            </button>
          ) : null}
        </div>

        <GymSearchResults
          gyms={search.gyms}
          isLoading={search.isLoading}
          isFetchingNext={search.isFetchingNext}
          error={search.error}
          hasMore={search.hasMore}
          onSelectGym={actions.onSelectGym}
          onLoadMore={actions.onLoadMore}
        />
      </div>
    </section>
  );
}
