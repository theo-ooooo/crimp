'use client';

import type { ReactNode } from 'react';

import { t } from '@/lib/i18n';
import type { GymDetail } from '@/lib/schemas/gym';

import { formatFeatures, formatOpeningHours } from './formatters';

export function MetaSection({ gym }: { gym: GymDetail }): JSX.Element {
  const hours = formatOpeningHours(gym.openingHoursJson);
  const features = formatFeatures(gym.featuresJson);

  return (
    <section
      aria-label={t('gym.detail.metaCardTitle')}
      className="grid gap-3 sm:grid-cols-2"
    >
      {gym.phone ? (
        <InfoTile label={t('gym.detail.phoneLabel')} value={gym.phone} />
      ) : null}
      {hours ? (
        <InfoTile label={t('gym.detail.hoursLabel')} value={hours} />
      ) : null}
      {gym.settingCycleDays != null ? (
        <InfoTile
          label={t('gym.detail.cycleLabel')}
          value={t('gym.detail.cycleValue').replace(
            '{{days}}',
            String(gym.settingCycleDays),
          )}
        />
      ) : null}
      {features ? (
        <InfoTile label={t('gym.detail.featuresLabel')} value={features} />
      ) : null}
    </section>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-xl bg-subtle p-4 shadow-xs">
      <p className="text-caption font-extrabold text-text-3">{label}</p>
      <div className="mt-1 text-body font-bold text-text">{value}</div>
    </div>
  );
}
