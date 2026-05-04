'use client';

import type { GymDetail, RouteItem } from '@/lib/schemas/gym';

export function GymSummary({
  gym,
  routes,
}: {
  gym: GymDetail;
  routes: RouteItem[];
}): JSX.Element {
  return (
    <section className="flex flex-col gap-4" aria-label="암장 요약">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-emerald-100 px-3 py-1 text-caption font-extrabold text-emerald-600">
          영업중
        </span>
        {gym.monthlyUserCount > 0 ? (
          <span className="text-caption font-bold text-text-3">
            지금 {gym.monthlyUserCount}명 다녀감
          </span>
        ) : null}
      </div>
      <div>
        <h1 className="text-[40px] font-extrabold leading-tight text-text sm:text-[48px]">
          {gym.name}
        </h1>
        {gym.address ? (
          <p className="mt-2 text-title font-semibold text-text-3">
            {gym.address}
          </p>
        ) : null}
      </div>
      <StatsRow gym={gym} routes={routes} />
    </section>
  );
}

function StatsRow({
  gym,
  routes,
}: {
  gym: GymDetail;
  routes: RouteItem[];
}): JSX.Element {
  const stats: Array<{ label: string; value: string }> = [];
  if (gym.rating != null) {
    stats.push({ label: '평점', value: Number(gym.rating).toFixed(1) });
  }
  stats.push({ label: '루트', value: `${routes.length || gym.sendCount}개` });
  stats.push({ label: '방문', value: `${gym.monthlyUserCount}명` });

  return (
    <div className="grid grid-cols-3 border-y border-hairline py-5">
      {stats.map((s) => (
        <div key={s.label}>
          <p className="text-caption font-extrabold text-text-3">{s.label}</p>
          <p className="mt-1 text-h2 font-extrabold text-text">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
