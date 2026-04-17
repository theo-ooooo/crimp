export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6">
      <section>
        <p className="text-sm uppercase tracking-[0.3em] text-crimp-500">Crimp</p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">
          클라이머를 위한 디지털 홈
        </h1>
        <p className="mt-4 text-base text-neutral-300">
          암장·루트·등반 로그·크루·아웃도어. 클라이머의 모든 순간을 한 곳에서.
        </p>
      </section>
      <section className="text-sm text-neutral-400">
        <p>Phase 1 MVP · 2026년 여름 오픈 예정</p>
      </section>
    </main>
  );
}
