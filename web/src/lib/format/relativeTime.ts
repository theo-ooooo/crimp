import { t } from '@/lib/i18n';

/**
 * 상대 시각 포맷터 — "방금 전", "5분 전", "1시간 전", "어제", 그 이상은 절대 날짜.
 *
 * 디자인 일관성: 피드/세션 타임라인 등 "최근성" 강조가 필요한 곳에서 사용.
 * Intl.RelativeTimeFormat 을 직접 쓰지 않는 이유 — 한국어 표현이 더 짧고 자연스럽도록
 * Phase 1 단계에서는 i18n 키 기반으로 직접 매핑.
 *
 * @param iso ISO-8601 문자열 (백엔드 Instant 직렬화)
 * @param now 테스트용 기준 시각 (생략 시 현재)
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const target = new Date(iso);
  const targetMs = target.getTime();
  if (Number.isNaN(targetMs)) return iso;

  const diffMs = now.getTime() - targetMs;
  const diffSec = Math.floor(diffMs / 1000);

  // 미래 시각 (시계 어긋남 등) 은 "방금 전" 으로 묶어 안전 처리.
  if (diffSec < 60) return t('feed.time.justNow');

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return t('feed.time.minutesAgo').replace('{{n}}', String(diffMin));
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return t('feed.time.hoursAgo').replace('{{n}}', String(diffHour));
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) {
    return t('feed.time.daysAgo').replace('{{n}}', String(diffDay));
  }

  // 7일 이상은 절대 날짜로 (월·일).
  try {
    return target.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
