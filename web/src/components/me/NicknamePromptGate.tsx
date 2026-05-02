'use client';

import { usePathname } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import { PrimaryButton, SecondaryButton } from '@/components/primitives';
import { useMeQuery } from '@/hooks/useMe';
import { useUpdateProfileMutation } from '@/hooks/useUpdateProfile';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { useAccessToken } from '@/store/tokenStore';

const DISMISS_KEY = 'crimp.nicknamePrompt.dismissed';
const NICKNAME_MIN = 2;
const NICKNAME_MAX = 30;

export function NicknamePromptGate(): JSX.Element | null {
  const pathname = usePathname();
  const accessToken = useAccessToken();
  const meQuery = useMeQuery(accessToken);
  const mutation = useUpdateProfileMutation(accessToken);
  const [dismissed, setDismissed] = useState(false);
  const [nickname, setNickname] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setDismissed(false);
      return;
    }
    setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!meQuery.data) return;
    setNickname(meQuery.data.nickname ?? '');
    setErrorMessage(null);
  }, [meQuery.data]);

  const trimmed = nickname.trim();
  const validation = useMemo(() => {
    if (trimmed.length < NICKNAME_MIN || trimmed.length > NICKNAME_MAX) {
      return t('me.nicknamePrompt.nicknameHelp');
    }
    return null;
  }, [trimmed]);

  const shouldShow =
    accessToken !== null &&
    pathname !== '/me/edit' &&
    meQuery.data?.nicknameConfigured === false &&
    !dismissed;

  if (!shouldShow) {
    return null;
  }

  const dismiss = () => {
    if (accessToken) {
      window.sessionStorage.setItem(DISMISS_KEY, accessToken);
    }
    setDismissed(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validation || mutation.isPending) {
      return;
    }
    mutation.mutate(
      { nickname: trimmed },
      {
        onSuccess: dismiss,
        onError: (err) => setErrorMessage(toUserMessage(err)),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-5 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nickname-prompt-title"
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-5 rounded-xl bg-bg p-6 shadow-[0_18px_44px_rgba(15,20,25,0.22)]"
      >
        <div className="flex flex-col gap-2">
          <p className="text-caption font-bold uppercase text-text-3">
            {t('me.nicknamePrompt.eyebrow')}
          </p>
          <h2
            id="nickname-prompt-title"
            className="text-h2 font-extrabold text-text"
          >
            {t('me.nicknamePrompt.title')}
          </h2>
          <p className="text-body leading-6 text-text-2">
            {t('me.nicknamePrompt.body')}
          </p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-caption font-bold text-text-2">
            {t('me.labelNickname')}
          </span>
          <input
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value);
              setErrorMessage(null);
            }}
            disabled={mutation.isPending}
            minLength={NICKNAME_MIN}
            maxLength={NICKNAME_MAX}
            required
            autoComplete="nickname"
            className="h-12 w-full rounded-lg border-0 bg-subtle-2 px-4 text-body font-semibold text-text placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder={t('me.nicknameFallback')}
          />
          <span className="text-caption leading-5 text-text-3">
            {t('me.nicknamePrompt.nicknameHelp')}
          </span>
        </label>

        {validation || errorMessage ? (
          <p role="alert" className="text-body font-semibold text-danger">
            {errorMessage ?? validation}
          </p>
        ) : null}

        <div className="flex gap-2">
          <SecondaryButton
            type="button"
            onClick={dismiss}
            disabled={mutation.isPending}
            className="flex-1"
          >
            {t('me.nicknamePrompt.laterCta')}
          </SecondaryButton>
          <PrimaryButton
            type="submit"
            disabled={mutation.isPending || Boolean(validation)}
            className="flex-1"
          >
            {mutation.isPending
              ? t('me.edit.saving')
              : t('me.nicknamePrompt.saveCta')}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
