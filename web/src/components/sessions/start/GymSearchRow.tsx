import { CrimpIcon } from '@/components/primitives';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';

export function GymSearchRow({
  gym,
  onSelectGym,
}: {
  gym: GymItem;
  onSelectGym: (gym: GymItem) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSelectGym(gym)}
      className="flex items-center gap-3 rounded-xl bg-bg p-3 text-left transition-transform duration-fast ease-standard active:scale-[0.99]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-title font-extrabold text-text">
        {gym.name.trim().charAt(0)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-extrabold text-text">
          {gym.name}
        </span>
        <span className="mt-0.5 block truncate text-caption font-semibold text-text-3">
          {gym.address ?? t('gym.list.addressFallback')}
        </span>
      </span>
      <CrimpIcon.chevR s={16} className="text-text-3" />
    </button>
  );
}
