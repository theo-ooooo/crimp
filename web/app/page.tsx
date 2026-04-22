import { HomeHealthPanel } from './_components/HomeHealthPanel';
import { t } from '@/lib/i18n';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6">
      <section>
        <p className="text-sm uppercase tracking-[0.3em] text-accent">
          {t('common.brand')}
        </p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">
          {t('home.tagline')}
        </h1>
        <p className="mt-4 text-base text-neutral-300">{t('home.description')}</p>
      </section>
      <HomeHealthPanel />
    </main>
  );
}
