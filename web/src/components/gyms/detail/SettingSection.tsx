'use client';

import type { GymDetail, RouteItem } from '@/lib/schemas/gym';

import { formatSettingSummary } from './formatters';

const GRADE_ORDER = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7'] as const;

export function SettingSection({
  gym,
  routes,
}: {
  gym: GymDetail;
  routes: RouteItem[];
}): JSX.Element {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="setting-title">
      <h2 id="setting-title" className="text-h2 font-extrabold text-text">
        현재 세팅
      </h2>
      <p className="text-body font-semibold text-text-3">
        {formatSettingSummary(gym)}
      </p>
      <GradeDistribution routes={routes} />
    </section>
  );
}

function GradeDistribution({ routes }: { routes: RouteItem[] }): JSX.Element {
  const counts = GRADE_ORDER.map((grade) => ({
    grade,
    count: routes.filter((r) => r.gradeValue === grade).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="flex h-28 items-end gap-2">
      {counts.map((c, i) => (
        <div key={c.grade} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-caption font-extrabold text-text-2">
            {c.count}
          </span>
          <div
            className="w-full rounded-md"
            style={{
              height: `${28 + (c.count / max) * 54}px`,
              backgroundColor: `hsl(${188 + i * 7} 42% ${78 - i * 6}%)`,
            }}
          />
          <span className="text-caption font-extrabold text-text-3">
            {c.grade}
          </span>
        </div>
      ))}
    </div>
  );
}
