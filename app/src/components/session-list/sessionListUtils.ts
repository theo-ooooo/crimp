import { t } from '@/lib/i18n';
import type { Session } from '@/lib/schemas/session';

export function countThisWeek(sessions: Session[]): number {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const diffToMonday = (day + 6) % 7;
  start.setDate(start.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  return sessions.filter((s) => {
    const t0 = new Date(s.startedAt).getTime();
    return Number.isFinite(t0) && t0 >= startMs;
  }).length;
}

export function formatSessionDurationShort(
  duration: number | null,
  ended: boolean,
): string {
  if (duration === null || !ended) {
    return t('session.list.itemDurationPending');
  }
  const total = Math.max(0, duration);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) {
    return `${h}h ${m < 10 ? `0${m}` : m}m`;
  }
  return `${m}m`;
}

export function formatSessionDurationA11y(
  duration: number | null,
  ended: boolean,
): string {
  if (duration === null || !ended) {
    return t('session.list.durationAccessibilityPending');
  }
  const total = Math.max(0, duration);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) {
    return t('session.list.durationAccessibilityHm')
      .replace('{{h}}', String(h))
      .replace('{{m}}', String(m));
  }
  return t('session.list.durationAccessibilityM').replace('{{m}}', String(m));
}

export function formatSessionDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
