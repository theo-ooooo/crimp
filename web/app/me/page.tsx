'use client';

import { useMeQuery } from '@/hooks/useMe';
import { t } from '@/lib/i18n';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

export default function MePage(): JSX.Element {
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();
  const { data, error, isLoading } = useMeQuery(accessToken);

  if (!hydrated) {
    // SSR hydration 전에는 빈 placeholder.
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6">
        <p className="text-sm text-neutral-400">{t('common.loading')}</p>
      </main>
    );
  }

  if (!accessToken) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-semibold">{t('me.loginRequiredTitle')}</h1>
        <p className="text-sm text-neutral-400">
          {t('me.loginRequiredDescription')}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">{t('me.title')}</h1>
      {isLoading ? (
        <p className="text-sm text-neutral-400">{t('common.loading')}</p>
      ) : error ? (
        <div className="rounded border border-red-900/50 bg-red-950/30 p-4 text-sm">
          <p className="text-red-400">{t('me.errorTitle')}</p>
          <p className="mt-1 font-mono text-xs text-neutral-500">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      ) : data ? (
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-neutral-500">{t('me.labelExtId')}</dt>
          <dd className="font-mono text-neutral-200">{data.extId}</dd>
          <dt className="text-neutral-500">{t('me.labelNickname')}</dt>
          <dd className="text-neutral-200">{data.nickname ?? t('me.empty')}</dd>
          <dt className="text-neutral-500">{t('me.labelBio')}</dt>
          <dd className="text-neutral-200">{data.bio ?? t('me.empty')}</dd>
          <dt className="text-neutral-500">{t('me.labelLevelSelf')}</dt>
          <dd className="text-neutral-200">
            {data.levelSelf ?? t('me.empty')}
          </dd>
          <dt className="text-neutral-500">{t('me.labelMainGymId')}</dt>
          <dd className="text-neutral-200">
            {data.mainGymId ?? t('me.empty')}
          </dd>
          <dt className="text-neutral-500">{t('me.labelAvatarMediaId')}</dt>
          <dd className="text-neutral-200">
            {data.avatarMediaId ?? t('me.empty')}
          </dd>
        </dl>
      ) : null}
    </main>
  );
}
