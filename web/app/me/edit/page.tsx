'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import {
  CrimpIcon,
  PrimaryButton,
  Skeleton,
} from '@/components/primitives';
import { useMeQuery } from '@/hooks/useMe';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useUpdateProfileMutation } from '@/hooks/useUpdateProfile';
import { toUserMessage } from '@/lib/api/errorMessage';
import type { UpdateProfileBody } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { Me } from '@/lib/schemas/me';

const BIO_MAX = 300;
const NICKNAME_MIN = 2;
const NICKNAME_MAX = 30;
const LEVEL_MIN = 0;
const LEVEL_MAX = 12;

export default function EditProfilePage(): JSX.Element {
  const accessToken = useRequireAuth();

  if (!accessToken) {
    return <EditProfileSkeleton />;
  }

  return <Loaded accessToken={accessToken} />;
}

function Loaded({ accessToken }: { accessToken: string }): JSX.Element {
  const router = useRouter();
  const meQuery = useMeQuery(accessToken);
  const mutation = useUpdateProfileMutation(accessToken);

  if (meQuery.isLoading) {
    return <EditProfileSkeleton />;
  }

  if (meQuery.error) {
    return (
      <PageShell>
        <Header />
        <ErrorCard
          title={t('me.errorTitle')}
          message={toUserMessage(meQuery.error)}
        />
      </PageShell>
    );
  }

  if (!meQuery.data) {
    return <EditProfileSkeleton />;
  }

  return (
    <ProfileEditForm
      me={meQuery.data}
      isSaving={mutation.isPending}
      error={mutation.error}
      onSubmit={(body) => {
        mutation.mutate(body, {
          onSuccess: () => {
            router.push('/me');
          },
        });
      }}
    />
  );
}

function ProfileEditForm({
  me,
  isSaving,
  error,
  onSubmit,
}: {
  me: Me;
  isSaving: boolean;
  error: Error | null;
  onSubmit: (body: UpdateProfileBody) => void;
}): JSX.Element {
  const [nickname, setNickname] = useState(me.nickname ?? '');
  const [bio, setBio] = useState(me.bio ?? '');
  const [levelSelf, setLevelSelf] = useState(clampLevel(me.levelSelf ?? 0));

  useEffect(() => {
    setNickname(me.nickname ?? '');
    setBio(me.bio ?? '');
    setLevelSelf(clampLevel(me.levelSelf ?? 0));
  }, [me.bio, me.levelSelf, me.nickname]);

  const originalNickname = me.nickname ?? '';
  const originalBio = me.bio ?? '';
  const originalLevel = clampLevel(me.levelSelf ?? 0);

  const validation = useMemo(() => {
    const trimmedNickname = nickname.trim();
    const trimmedBio = bio.trim();

    if (
      trimmedNickname.length < NICKNAME_MIN ||
      trimmedNickname.length > NICKNAME_MAX
    ) {
      return t('me.edit.nicknameHelp');
    }
    if (trimmedBio.length > BIO_MAX) {
      return t('me.edit.bioHelp');
    }
    return null;
  }, [bio, nickname]);

  const isDirty =
    nickname.trim() !== originalNickname ||
    bio.trim() !== originalBio ||
    levelSelf !== originalLevel;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validation || !isDirty) return;
    const body: UpdateProfileBody = {};
    if (nickname.trim() !== originalNickname) {
      body.nickname = nickname.trim();
    }
    if (bio.trim() !== originalBio) {
      body.bio = bio.trim();
    }
    if (levelSelf !== originalLevel) {
      body.levelSelf = levelSelf;
    }
    onSubmit(body);
  };

  return (
    <PageShell>
      <Header />
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label={t('me.labelNickname')} help={t('me.edit.nicknameHelp')}>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={isSaving}
            minLength={NICKNAME_MIN}
            maxLength={NICKNAME_MAX}
            required
            autoComplete="nickname"
            className="h-12 w-full rounded-lg border-0 bg-subtle-2 px-4 text-body font-medium text-text placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder={t('me.nicknameFallback')}
          />
        </Field>

        <Field label={t('me.labelBio')} help={t('me.edit.bioHelp')}>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={isSaving}
            maxLength={BIO_MAX}
            rows={5}
            className="w-full resize-none rounded-lg border-0 bg-subtle-2 px-4 py-3 text-body font-medium text-text placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder={t('me.edit.bioPlaceholder')}
          />
          <p className="text-right text-caption font-medium text-text-4">
            {bio.trim().length}/{BIO_MAX}
          </p>
        </Field>

        <Field label={t('me.labelLevelSelf')} help={t('me.edit.levelHelp')}>
          <LevelSlider
            value={levelSelf}
            disabled={isSaving}
            onChange={setLevelSelf}
          />
        </Field>

        {validation ? (
          <p
            role="alert"
            className="rounded-2xl bg-subtle p-4 text-body text-danger"
          >
            {validation}
          </p>
        ) : null}

        {error ? (
          <ErrorCard
            title={t('me.edit.errorTitle')}
            message={toUserMessage(error)}
          />
        ) : null}

        <div className="mt-2 flex gap-2">
          <Link
            href="/me"
            className="inline-flex h-14 flex-1 items-center justify-center rounded-lg bg-subtle text-[17px] font-semibold tracking-[-0.02em] text-text transition-transform duration-fast ease-standard active:scale-[0.98]"
          >
            {t('common.cancel')}
          </Link>
          <PrimaryButton
            type="submit"
            className="flex-1"
            disabled={isSaving || !isDirty || Boolean(validation)}
          >
            {isSaving ? t('me.edit.saving') : t('common.save')}
          </PrimaryButton>
        </div>
      </form>
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 bg-bg px-6 py-10">
      {children}
    </main>
  );
}

function Header(): JSX.Element {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-caption font-bold uppercase tracking-[0.2em] text-text-3">
          {t('me.eyebrow')}
        </p>
        <h1 className="text-h1 font-extrabold text-text">
          {t('me.edit.title')}
        </h1>
      </div>
      <Link
        href="/me"
        aria-label={t('common.close')}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-2 transition-colors duration-fast ease-standard hover:bg-subtle"
      >
        <CrimpIcon.close s={22} />
      </Link>
    </header>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-caption font-semibold text-text-3">{label}</span>
      {children}
      <span className="text-caption font-medium text-text-4">{help}</span>
    </label>
  );
}

function LevelSlider({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}): JSX.Element {
  const values = Array.from({ length: LEVEL_MAX - LEVEL_MIN + 1 }, (_, i) => i);
  return (
    <div className="flex min-h-24 flex-col gap-4 rounded-lg bg-subtle-2 p-4">
      <p className="text-h2 font-extrabold tracking-[-0.03em] text-text">
        V{value}
      </p>
      <div className="flex min-h-12 items-start justify-between gap-1">
        {values.map((v) => {
          const active = v <= value;
          const selected = v === value;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              disabled={disabled}
              role="radio"
              aria-checked={selected}
              aria-label={`V${v}`}
              className="flex min-h-11 w-7 flex-col items-center gap-2"
            >
              <span
                className={[
                  'rounded-full transition-all duration-fast ease-standard',
                  selected ? 'h-[18px] w-[18px] border-4 border-bg' : 'h-2 w-2',
                  active ? 'bg-accent' : 'bg-text-4',
                ].join(' ')}
              />
              {v % 3 === 0 || selected ? (
                <span
                  className={[
                    'text-[10px] font-semibold',
                    selected ? 'text-text' : 'text-text-4',
                  ].join(' ')}
                >
                  V{v}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function clampLevel(value: number): number {
  return Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, Math.round(value)));
}

function EditProfileSkeleton(): JSX.Element {
  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton h={14} w={72} />
          <Skeleton h={32} w={160} />
        </div>
        <Skeleton h={40} w={40} r={20} />
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton h={76} r={16} />
        <Skeleton h={142} r={16} />
        <Skeleton h={76} r={16} />
      </div>
    </PageShell>
  );
}

function ErrorCard({
  title,
  message,
}: {
  title: string;
  message: string;
}): JSX.Element {
  return (
    <div role="alert" className="rounded-2xl bg-subtle p-5 shadow-xs">
      <p className="text-title font-bold text-danger">{title}</p>
      <p className="mt-1 text-body text-text-2">{message}</p>
    </div>
  );
}
