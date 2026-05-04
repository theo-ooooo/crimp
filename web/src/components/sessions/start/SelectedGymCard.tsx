import { t } from '@/lib/i18n';

import type { StartSessionGymChoice } from './types';

export function SelectedGymCard({
  gym,
  onChange,
}: {
  gym: StartSessionGymChoice;
  onChange: () => void;
}): JSX.Element {
  return (
    <section
      role="status"
      aria-label={t('session.start.selectedGymLabel')}
      className="flex items-center justify-between gap-3 rounded-2xl bg-subtle p-4 shadow-xs"
    >
      <div className="min-w-0">
        <span className="text-caption font-semibold text-text-3">
          {t('session.start.selectedGymLabel')}
        </span>
        <p className="mt-1 truncate text-title font-extrabold text-text">
          {gym.name}
        </p>
        {gym.brand || gym.address ? (
          <p className="mt-0.5 truncate text-caption font-semibold text-text-3">
            {gym.brand ?? gym.address}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onChange}
        aria-label={t('session.start.useOtherGymCta')}
        className="inline-flex h-9 shrink-0 items-center rounded-full bg-bg px-3 text-caption font-extrabold text-text-2 transition-colors duration-fast ease-standard hover:text-text"
      >
        {t('session.start.useOtherGymCta')}
      </button>
    </section>
  );
}
