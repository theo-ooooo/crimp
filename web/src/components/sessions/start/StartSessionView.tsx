'use client';

import Link from 'next/link';

import { CrimpIcon, PrimaryButton } from '@/components/primitives';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';

import { FieldLabel } from './FieldLabel';
import { GymChoiceSection } from './GymChoiceSection';
import type { StartSessionViewProps } from './types';

export function StartSessionView({
  gymChoice,
  gymSearch,
  gymActions,
  submit,
  startedAtLocal,
  onStartedAtChange,
}: StartSessionViewProps): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 bg-bg px-6 py-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-caption font-extrabold text-text-3">
            {t('session.start.title')}
          </p>
          <h1 className="text-h1 font-extrabold text-text">
            {t('session.start.question')}
          </h1>
          <p className="text-body font-medium text-text-3">
            {t('session.start.subtitle')}
          </p>
        </div>
        <Link
          href="/sessions"
          aria-label={t('common.close')}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-2 transition-colors duration-fast ease-standard hover:bg-subtle"
        >
          <CrimpIcon.close s={22} />
        </Link>
      </header>

      <form onSubmit={submit.onSubmit} className="flex flex-col gap-5">
        <GymChoiceSection
          choice={gymChoice}
          search={gymSearch}
          actions={gymActions}
        />

        <FieldLabel label={t('session.start.startedAtLabel')}>
          <input
            type="datetime-local"
            value={startedAtLocal}
            required
            onChange={(e) => onStartedAtChange(e.target.value)}
            className="h-12 w-full rounded-lg border-0 bg-subtle-2 px-4 text-body font-medium text-text tabular-nums focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </FieldLabel>

        {submit.error ? (
          <div role="alert" className="rounded-2xl bg-subtle p-4 shadow-xs">
            <p className="text-title font-bold text-danger">
              {t('session.start.errorTitle')}
            </p>
            <p className="mt-1 text-body text-text-2">{toUserMessage(submit.error)}</p>
          </div>
        ) : null}

        <PrimaryButton
          type="submit"
          disabled={!submit.canSubmit || submit.isPending}
          className="text-accent-on"
        >
          <span className="inline-flex items-center gap-2">
            {submit.isPending ? null : <CrimpIcon.play s={18} />}
            {submit.isPending ? t('session.start.submitting') : t('session.start.submit')}
          </span>
        </PrimaryButton>
      </form>
    </main>
  );
}
