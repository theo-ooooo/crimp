import type { ReactNode } from 'react';

import { t } from '@/lib/i18n';
import type { GymDetail, RouteItem } from '@/lib/schemas/gym';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABEL: Record<string, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

export function formatRouteMeta(route: RouteItem): string {
  const parts: string[] = [];
  if (route.setter) {
    parts.push(`${t('gym.detail.routeSetterLabel')} ${route.setter}`);
  }
  if (route.setAt) {
    parts.push(`${t('gym.detail.routeSetAtLabel')} ${formatSetAt(route.setAt)}`);
  }
  return parts.join(' · ') || '세팅 정보 없음';
}

export function formatSettingSummary(gym: GymDetail): string {
  if (gym.settingCycleDays == null) return '최근 세팅 정보가 업데이트 예정입니다';
  return `${gym.settingCycleDays}일 주기로 세팅 정보가 갱신됩니다`;
}

export function formatOpeningHours(raw: string | null | undefined): ReactNode | null {
  const parsed = parseJson(raw);
  if (parsed == null) return cleanText(raw);
  if (typeof parsed === 'string') return parsed;
  if (Array.isArray(parsed)) return parsed.map(String).join(' · ');
  if (typeof parsed !== 'object') return String(parsed);

  const entries = Object.entries(parsed as Record<string, unknown>)
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .sort(([a], [b]) => dayRank(a) - dayRank(b));
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {entries.map(([day, value]) => (
        <p key={day}>
          <span className="mr-2 text-text-3">
            {DAY_LABEL[day.toLowerCase()] ?? day}
          </span>
          <span>{String(value)}</span>
        </p>
      ))}
    </div>
  );
}

export function formatFeatures(raw: string | null | undefined): ReactNode | null {
  const parsed = parseJson(raw);
  if (parsed == null) return cleanText(raw);
  if (Array.isArray(parsed)) {
    const items = parsed.map(String).filter(Boolean);
    return items.length > 0 ? items.join(' · ') : null;
  }
  if (typeof parsed === 'object') {
    const items = Object.entries(parsed as Record<string, unknown>)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
    return items.length > 0 ? items.join(' · ') : null;
  }
  return String(parsed);
}

function formatSetAt(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function parseJson(raw: string | null | undefined): unknown | null {
  const text = cleanText(raw);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cleanText(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

function dayRank(day: string): number {
  const normalized = day.toLowerCase().slice(0, 3);
  const idx = DAY_ORDER.indexOf(normalized as (typeof DAY_ORDER)[number]);
  return idx === -1 ? 99 : idx;
}
