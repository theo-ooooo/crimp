'use client';

import { useHealthQuery } from '@/hooks/useHealth';
import { t } from '@/lib/i18n';

export function HomeHealthPanel(): JSX.Element {
  const { data, error, isLoading, refetch, isFetching } = useHealthQuery();

  return (
    <section
      aria-labelledby="home-health-title"
      className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-5 text-sm"
    >
      <h2
        id="home-health-title"
        className="text-xs uppercase tracking-widest text-neutral-400"
      >
        {t('home.healthSectionTitle')}
      </h2>

      {isLoading ? (
        <p className="mt-3 text-neutral-400">{t('common.loading')}</p>
      ) : error ? (
        <div className="mt-3 space-y-1">
          <p className="text-red-400">{t('home.healthErrorTitle')}</p>
          <p className="text-neutral-500">{t('home.healthErrorHint')}</p>
          <p className="font-mono text-xs text-neutral-600">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
            className="mt-2 rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : data ? (
        <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 font-mono text-xs text-neutral-300">
          <dt className="text-neutral-500">{t('home.healthLabelStatus')}</dt>
          <dd>{data.status}</dd>
          <dt className="text-neutral-500">{t('home.healthLabelBrand')}</dt>
          <dd>{data.brand}</dd>
          <dt className="text-neutral-500">{t('home.healthLabelEnv')}</dt>
          <dd>{data.env}</dd>
          <dt className="text-neutral-500">{t('home.healthLabelServerTime')}</dt>
          <dd>{data.serverTime}</dd>
        </dl>
      ) : null}
    </section>
  );
}
