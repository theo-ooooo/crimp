import React, { useMemo } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import {
  Chip,
  GradeBadge,
  HoldDot,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
  CrimpIcon,
} from '@/components/common/primitives';
import type { HoldColorKey } from '@/components/common/primitives';
import { makeGymDetailStyles } from '@/components/gym/gymDetailStyles';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { fontWeight, radius, space, type Theme } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { GymActiveSessions, GymDetail, GymRecentActivity, RouteItem } from '@/lib/schemas/gym';

type Props = {
  theme: Theme;
  styles: ReturnType<typeof makeGymDetailStyles>;
  gym: GymDetail | null;
  gymLoading: boolean;
  gymError: Error | null;
  accessToken: string | null;
  routes: RouteItem[];
  routesLoading: boolean;
  routesError: Error | null;
  recentActivity: GymRecentActivity | null;
  recentActivityLoading: boolean;
  recentActivityError: Error | null;
  activeSessions: GymActiveSessions | null;
  activeSessionsLoading: boolean;
  activeSessionsError: Error | null;
  hasMoreRoutes: boolean;
  isFetchingMoreRoutes: boolean;
  onLoadMoreRoutes: () => void;
  onStartSession: (gym: GymDetail) => void;
  onBack: () => void;
};

export function GymDetailBody({
  theme,
  styles,
  gym,
  gymLoading,
  gymError,
  accessToken,
  routes,
  routesLoading,
  routesError,
  recentActivity,
  recentActivityLoading,
  recentActivityError,
  activeSessions,
  activeSessionsLoading,
  activeSessionsError,
  hasMoreRoutes,
  isFetchingMoreRoutes,
  onLoadMoreRoutes,
  onStartSession,
  onBack,
}: Props): JSX.Element {
  const bodyStyles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={bodyStyles.content}>
        {gymLoading ? (
          <>
            <Skeleton height={290} radius={radius['2xl']} />
            <View style={{ height: space[4] }} />
            <Skeleton height={118} radius={radius.xl} />
            <View style={{ height: space[3] }} />
            <Skeleton height={220} radius={radius.xl} />
          </>
        ) : gymError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>{t('gym.detail.errorTitle')}</Text>
            <Text style={styles.errorBody}>{toUserMessage(gymError)}</Text>
          </View>
        ) : gym ? (
          <>
            <HeroSection
              gym={gym}
              theme={theme}
              activeUsers={activeSessions?.activeUsers ?? 0}
              onBack={onBack}
            />
            <SummarySection gym={gym} theme={theme} />
            <ActiveSessionsSection
              theme={theme}
              activeSessions={activeSessions}
              loading={activeSessionsLoading}
              error={activeSessionsError}
            />
            <RecentActivitySection
              theme={theme}
              recentActivity={recentActivity}
              loading={recentActivityLoading}
              error={recentActivityError}
            />
            <GymMetaCard gym={gym} theme={theme} />
            <RoutesSection
              accessToken={accessToken}
              routes={routes}
              isLoading={routesLoading}
              error={routesError}
              hasMore={hasMoreRoutes}
              isFetchingMore={isFetchingMoreRoutes}
              onLoadMore={onLoadMoreRoutes}
            />
          </>
        ) : null}
      </ScrollView>

      {gym ? (
        <View style={styles.bottomBar}>
          <PrimaryButton
            onPress={() => onStartSession(gym)}
            accessibilityLabel={t('gym.detail.startSessionCta')}
          >
            {t('gym.detail.startSessionCta')}
          </PrimaryButton>
        </View>
      ) : null}
    </View>
  );
}

function HeroSection({
  gym,
  theme,
  activeUsers,
  onBack,
}: {
  gym: GymDetail;
  theme: Theme;
  activeUsers: number;
  onBack: () => void;
}): JSX.Element {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const statusText = openingStatusLabel(gym.openingHoursJson);
  const heroLetter = Array.from(gym.name)[0] ?? 'G';
  const [isFavorite, setIsFavorite] = React.useState(false);

  return (
    <View style={styles.heroWrap}>
      <View style={styles.heroAvatarWrap}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText} allowFontScaling={false}>
            {heroLetter}
          </Text>
        </View>
      </View>
      <View style={styles.heroOverlay}>
        <View style={styles.heroTopRow}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="뒤로 가기">
            <PressIcon icon="chevL" />
          </Pressable>
          <View style={styles.heroActions}>
            <Pressable
              onPress={() => setIsFavorite((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="즐겨찾기"
              hitSlop={8}
            >
              <PressIcon icon="heart" fill={isFavorite} />
            </Pressable>
            <Pressable
              onPress={() =>
                Share.share({
                  message: [gym.name, gym.address ?? null].filter(Boolean).join('\n'),
                }).catch(() => {})
              }
              accessibilityRole="button"
              accessibilityLabel="공유"
              hitSlop={8}
            >
              <PressIcon icon="dots" />
            </Pressable>
          </View>
        </View>
        <View style={styles.heroStatusRow}>
          <Chip label={statusText} />
          <Text style={styles.heroLiveText}>지금 {activeUsers}명 운동중</Text>
        </View>
      </View>
    </View>
  );
}

function SummarySection({ gym, theme }: { gym: GymDetail; theme: Theme }): JSX.Element {
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.nameBlock}>
        <Text style={styles.name}>{gym.name}</Text>
        <Text style={styles.address}>{gym.address ?? t('gym.detail.addressFallback')}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatItem label="평점" value={formatRating(gym.rating)} />
        <StatItem label="완등" value={`${gym.sendCount}개`} />
        <StatItem label="친구" value={`${gym.monthlyUserCount}명`} />
      </View>
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ActiveSessionsSection({
  theme,
  activeSessions,
  loading,
  error,
}: {
  theme: Theme;
  activeSessions: GymActiveSessions | null;
  loading: boolean;
  error: Error | null;
}): JSX.Element {
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>현재 세팅</Text>
      <Text style={styles.sectionSub}>지금 운동중인 인원과 난이도 분포</Text>

      {loading ? (
        <View style={styles.sectionLoading}>
          <Skeleton height={180} radius={radius.xl} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('gym.detail.errorTitle')}</Text>
          <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
        </View>
      ) : activeSessions ? (
        <View style={styles.sessionWrap}>
          <View style={styles.sessionMetaRow}>
            <Text style={styles.sessionMetaLabel}>운동중</Text>
            <Text style={styles.sessionMetaValue}>{activeSessions.activeUsers}명</Text>
          </View>
          <View style={styles.sessionChart}>
            {activeSessions.gradeBuckets.map((bucket) => (
              <SessionBar key={bucket.grade} grade={bucket.grade} count={bucket.count} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SessionBar({ grade, count }: { grade: string; count: number }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const max = 12;
  const height = Math.max(12, Math.min(100, (count / max) * 100));
  return (
    <View style={styles.barCell}>
      <Text style={styles.barCount}>{count}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { height: `${height}%` }]} />
      </View>
      <Text style={styles.barLabel}>{grade}</Text>
    </View>
  );
}

function RecentActivitySection({
  theme,
  recentActivity,
  loading,
  error,
}: {
  theme: Theme;
  recentActivity: GymRecentActivity | null;
  loading: boolean;
  error: Error | null;
}): JSX.Element {
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>최근 완등</Text>
      {loading ? (
        <View style={styles.activityList}>
          <Skeleton height={60} radius={radius.lg} />
          <Skeleton height={60} radius={radius.lg} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('gym.detail.errorTitle')}</Text>
          <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
        </View>
      ) : recentActivity && recentActivity.items.length > 0 ? (
        <View style={styles.activityList}>
          {recentActivity.items.map((item) => (
            <RecentActivityRow key={`${item.userExtId}-${item.loggedAt}`} item={item} />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>최근 완등 기록이 없어요</Text>
      )}
    </View>
  );
}

function RecentActivityRow({
  item,
}: {
  item: GymRecentActivity['items'][number];
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const avatarChar = Array.from(item.nickname)[0] ?? '';
  const timeText = formatRelativeTime(item.loggedAt);

  return (
    <View style={styles.activityRow}>
      <View style={[styles.avatar, { backgroundColor: hueToBg(item.avatarColorHue) }]}>
        <Text style={styles.avatarText}>{avatarChar}</Text>
      </View>
      <View style={styles.activityBody}>
        <Text style={styles.activityName} numberOfLines={1}>
          {item.nickname}
        </Text>
        <Text style={styles.activityTime} numberOfLines={1}>
          {timeText}
        </Text>
      </View>
      <View style={styles.activityMeta}>
        <View style={styles.activityDot} />
        <GradeBadge v={item.gradeValue} size="sm" />
      </View>
    </View>
  );
}

function GymMetaCard({ gym, theme }: { gym: GymDetail; theme: Theme }): JSX.Element {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const openingHours = formatOpeningHours(gym.openingHoursJson);
  const features = formatFeatures(gym.featuresJson);

  return (
    <View style={styles.metaCard}>
      <MetaRow label={t('gym.detail.metaPhone')} value={gym.phone} />
      <MetaRow
        label={t('gym.detail.metaHours')}
        value={openingHours[0] ?? null}
        multiline
      />
      {openingHours.length > 1 ? (
        <View style={styles.metaBlock}>
          {openingHours.slice(1).map((line) => (
            <Text key={line} style={styles.metaValueLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      <MetaRow
        label={t('gym.detail.metaCycle')}
        value={gym.settingCycleDays !== null ? `${gym.settingCycleDays}${t('gym.detail.metaCycleUnit')}` : null}
      />
      <View style={styles.metaSection}>
        <Text style={styles.metaLabel}>{t('gym.detail.metaFeatures')}</Text>
        {features.length > 0 ? (
          <View style={styles.featureChipRow}>
            {features.map((feature) => (
              <Chip key={feature} label={feature} />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('gym.detail.metaEmpty')}</Text>
        )}
      </View>
    </View>
  );
}

function MetaRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text
        style={[styles.metaValue, multiline ? styles.metaValueMultiline : null]}
        numberOfLines={multiline ? undefined : 2}
      >
        {value && value.length > 0 ? value : t('gym.detail.metaEmpty')}
      </Text>
    </View>
  );
}

function RoutesSection({
  accessToken,
  routes,
  isLoading,
  error,
  hasMore,
  isFetchingMore,
  onLoadMore,
}: {
  accessToken: string | null;
  routes: RouteItem[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{t('gym.detail.routesTitle')}</Text>

      {!accessToken ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{t('gym.detail.routesLoginRequired')}</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.activityList}>
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('gym.detail.routesErrorTitle')}</Text>
          <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
        </View>
      ) : routes.length === 0 ? (
        <Text style={styles.emptyText}>{t('gym.detail.routesEmpty')}</Text>
      ) : (
        <>
          <View style={styles.routeList}>
            {routes.map((r) => (
              <RouteCard key={r.extId} route={r} />
            ))}
          </View>
          {hasMore ? (
            <View style={styles.loadMore}>
              <SecondaryButton onPress={onLoadMore} disabled={isFetchingMore}>
                {isFetchingMore ? t('common.loading') : t('gym.detail.routesLoadMore')}
              </SecondaryButton>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function RouteCard({ route }: { route: RouteItem }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeRouteStyles(theme), [theme]);

  const holdColor: HoldColorKey | string = normalizeHoldColor(route.color);
  const gradeLabel = route.gradeValue ?? '';

  return (
    <View style={styles.card}>
      <View style={styles.leading}>
        <HoldDot color={holdColor} size={18} />
        {gradeLabel.length > 0 ? <GradeBadge v={gradeLabel} size="sm" /> : null}
      </View>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {route.name ?? gradeLabel}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {t('gym.detail.routeSetterPrefix')} · {route.setter ?? t('gym.detail.routeSetterUnknown')}
          {route.setAt ? `  ·  ${t('gym.detail.routeSetAtPrefix')} ${route.setAt}` : ''}
        </Text>
      </View>
    </View>
  );
}

function PressIcon({
  icon,
  fill = false,
}: {
  icon: 'chevL' | 'heart' | 'dots';
  fill?: boolean;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const iconNode =
    icon === 'chevL' ? (
      <CrimpIcon.chevL size={20} color={theme.text} />
    ) : icon === 'heart' ? (
      <CrimpIcon.heart size={20} color={theme.text} fill={fill} />
    ) : (
      <CrimpIcon.dots size={20} color={theme.text} />
    );
  return (
    <View style={styles.pressIcon}>
      {iconNode}
    </View>
  );
}

function formatRating(rating: number | null): string {
  if (rating === null || Number.isNaN(rating)) {
    return '—';
  }
  return `${rating.toFixed(1)}`;
}

export function openingStatusLabel(openingHoursJson: string | null, now: Date = new Date()): string {
  const schedule = parseOpeningHoursSchedule(openingHoursJson);
  if (schedule.length === 0) {
    return '영업 정보 없음';
  }

  const today = now.getDay();
  const todayEntries = schedule.filter((entry) => entry.days.includes(today));
  if (todayEntries.length === 0) {
    return '오늘 휴무';
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let nextOpen: string | null = null;

  for (const entry of todayEntries) {
    if (entry.closed) {
      continue;
    }
    if (entry.open24h) {
      return '영업중 · 24시간';
    }
    for (const window of entry.windows) {
      if (isWindowOpen(window, nowMinutes)) {
        return `영업중 · ${formatMinutes(window.end)} 마감`;
      }
      if (window.start > nowMinutes) {
        const candidate = `오늘 ${formatMinutes(window.start)} 오픈`;
        if (!nextOpen) {
          nextOpen = candidate;
        }
      }
    }
  }

  return nextOpen ?? '오늘 휴무';
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) {
    return '방금 전';
  }
  if (diffMin < 60) {
    return `${diffMin}분 전`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour}시간 전`;
  }
  return d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
}

function hueToBg(hue: number): string {
  return `hsl(${hue}, 60%, 80%)`;
}

function normalizeHoldColor(raw: string | null): HoldColorKey | string {
  if (!raw) {
    return 'gray';
  }
  const lower = raw.toLowerCase();
  const map: Record<string, HoldColorKey> = {
    red: 'red',
    blue: 'blue',
    yellow: 'yellow',
    green: 'green',
    white: 'white',
    black: 'black',
    pink: 'pink',
    orange: 'orange',
    purple: 'purple',
    gray: 'gray',
    grey: 'gray',
    '빨강': 'red',
    '파랑': 'blue',
    '노랑': 'yellow',
    '초록': 'green',
    '흰색': 'white',
    '검정': 'black',
    '분홍': 'pink',
    '주황': 'orange',
    '보라': 'purple',
    '회색': 'gray',
  };
  return map[lower] ?? map[raw] ?? raw;
}

function formatOpeningHours(raw: string | null): string[] {
  if (raw === null || raw.length === 0) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null) {
      return [];
    }
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeStructuredValue(item))
        .filter((line): line is string => line.length > 0);
    }
    if (typeof parsed === 'object') {
      return Object.entries(parsed)
        .flatMap(([key, value]) => {
          const normalized = normalizeStructuredValue(value);
          if (normalized.length === 0) {
            return [];
          }
          return [`${humanizeKey(key)} ${normalized}`.trim()];
        })
        .filter((line) => line.length > 0);
    }
    return [String(parsed)];
  } catch {
    return [raw];
  }
}

function formatFeatures(raw: string | null): string[] {
  if (raw === null || raw.length === 0) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null) {
      return [];
    }
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeStructuredValue(item))
        .filter((line): line is string => line.length > 0);
    }
    if (typeof parsed === 'object') {
      return Object.entries(parsed)
        .flatMap(([key, value]) => {
          if (typeof value === 'boolean') {
            return value ? [humanizeKey(key)] : [];
          }
          const normalized = normalizeStructuredValue(value);
          if (normalized.length === 0) {
            return [];
          }
          return [normalized === 'true' ? humanizeKey(key) : `${humanizeKey(key)} ${normalized}`.trim()];
        })
        .filter((line) => line.length > 0);
    }
    return [String(parsed)];
  } catch {
    return raw
      .split(/[,\n]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
}

type OpeningWindow = {
  start: number;
  end: number;
};

type OpeningScheduleEntry = {
  days: number[];
  windows: OpeningWindow[];
  closed: boolean;
  open24h: boolean;
};

const WEEKDAY_ORDERING: ReadonlyArray<{
  index: number;
  labels: string[];
}> = [
  { index: 1, labels: ['mon', '월'] },
  { index: 2, labels: ['tue', '화'] },
  { index: 3, labels: ['wed', '수'] },
  { index: 4, labels: ['thu', '목'] },
  { index: 5, labels: ['fri', '금'] },
  { index: 6, labels: ['sat', '토'] },
  { index: 0, labels: ['sun', '일'] },
];

function parseOpeningHoursSchedule(openingHoursJson: string | null): OpeningScheduleEntry[] {
  if (!openingHoursJson || openingHoursJson.trim().length === 0) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(openingHoursJson);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return [];
  }

  const schedule: OpeningScheduleEntry[] = [];
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const days = parseWeekdayKey(key);
    if (days.length === 0) {
      continue;
    }

    const values = flattenOpeningValues(value);
    for (const raw of values) {
      const normalized = raw.toLowerCase();
      if (!normalized || /휴무|closed|off/.test(normalized)) {
        schedule.push({ days, windows: [], closed: true, open24h: false });
        continue;
      }
      if (/24\s*시간|24h|24\/7/.test(normalized)) {
        schedule.push({ days, windows: [{ start: 0, end: 24 * 60 }], closed: false, open24h: true });
        continue;
      }

      const windows = parseTimeWindows(raw);
      if (windows.length > 0) {
        schedule.push({ days, windows, closed: false, open24h: false });
      }
    }
  }

  return schedule;
}

function flattenOpeningValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value.trim()].filter((item) => item.length > 0);
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenOpeningValues(item));
  }
  return [];
}

function parseWeekdayKey(raw: string): number[] {
  const tokens = raw
    .toLowerCase()
    .replace(/\s+/g, '')
    .match(/mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|월(?:요일)?|화(?:요일)?|수(?:요일)?|목(?:요일)?|금(?:요일)?|토(?:요일)?|일(?:요일)?/g);
  if (!tokens || tokens.length === 0) {
    return [];
  }

  if (tokens.length === 1) {
    const single = weekdayTokenToIndex(tokens[0]!);
    return single === null ? [] : [single];
  }

  const start = weekdayTokenToIndex(tokens[0]!);
  const end = weekdayTokenToIndex(tokens[tokens.length - 1]!);
  if (start === null || end === null) {
    return Array.from(
      new Set(tokens.map(weekdayTokenToIndex).filter((day): day is number => day !== null)),
    );
  }

  const days: number[] = [];
  let current = start;
  for (let guard = 0; guard < 7; guard += 1) {
    days.push(current);
    if (current === end) {
      break;
    }
    current = (current + 1) % 7;
  }
  return Array.from(new Set(days));
}

function weekdayTokenToIndex(raw: string): number | null {
  const normalized = raw.toLowerCase();
  const match = WEEKDAY_ORDERING.find((entry) =>
    entry.labels.some((label) => normalized.startsWith(label)),
  );
  return match?.index ?? null;
}

function parseTimeWindows(raw: string): OpeningWindow[] {
  return raw
    .split(/[,\u00b7/|]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .flatMap((part) => {
      const match = part.match(
        /(\d{1,2})(?::(\d{2}))?\s*[-~]\s*(\d{1,2})(?::(\d{2}))?/,
      );
      if (!match) {
        return [];
      }
      const start = toMinutes(match[1]!, match[2]);
      const end = toMinutes(match[3]!, match[4]);
      if (start === null || end === null) {
        return [];
      }
      return [{ start, end }];
    });
}

function toMinutes(hourRaw: string, minuteRaw?: string): number | null {
  const hour = Number(hourRaw);
  const minute = minuteRaw ? Number(minuteRaw) : 0;
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  if (hour < 0 || hour > 24 || minute < 0 || minute > 59) {
    return null;
  }
  if (hour === 24 && minute !== 0) {
    return null;
  }
  return hour * 60 + minute;
}

function isWindowOpen(window: OpeningWindow, nowMinutes: number): boolean {
  if (window.end >= window.start) {
    return nowMinutes >= window.start && nowMinutes < window.end;
  }
  return nowMinutes >= window.start || nowMinutes < window.end;
}

function formatMinutes(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function normalizeStructuredValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return normalizeTextWithWeekdays(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeStructuredValue(item)).filter(Boolean).join(' · ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => `${humanizeKey(key)} ${normalizeStructuredValue(nested)}`.trim())
      .filter((line) => line.length > 0)
      .join(' · ');
  }
  return String(value);
}

function humanizeKey(raw: string): string {
  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
}

const WEEKDAY_ORDER: ReadonlyArray<{
  index: number;
  labels: string[];
}> = [
  { index: 0, labels: ['월', 'mon'] },
  { index: 1, labels: ['화', 'tue'] },
  { index: 2, labels: ['수', 'wed'] },
  { index: 3, labels: ['목', 'thu'] },
  { index: 4, labels: ['금', 'fri'] },
  { index: 5, labels: ['토', 'sat'] },
  { index: 6, labels: ['일', 'sun'] },
];

function normalizeTextWithWeekdays(raw: string): string {
  const extracted = extractWeekdays(raw);
  const remainder = raw
    .replace(extracted.sourceRegex, ' ')
    .replace(/\b(?:x|X)\b/g, ' ')
    .replace(/[·,/|()+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const weekdayPrefix = extracted.weekdays.length > 0 ? extracted.weekdays.join(' ') : '';
  if (weekdayPrefix.length === 0) {
    return remainder.length > 0 ? remainder : raw.trim();
  }
  if (remainder.length === 0) {
    return weekdayPrefix;
  }
  return `${weekdayPrefix} ${remainder}`.trim();
}

function extractWeekdays(raw: string): { weekdays: string[]; sourceRegex: RegExp } {
  const sourceRegex =
    /(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|월(?:요일)?|화(?:요일)?|수(?:요일)?|목(?:요일)?|금(?:요일)?|토(?:요일)?|일(?:요일)?)/gi;
  const matches = Array.from(raw.matchAll(sourceRegex));
  if (matches.length === 0) {
    return { weekdays: [], sourceRegex };
  }
  const weekdays = matches
    .map((match) => normalizeWeekdayToken(match[0]))
    .filter((label): label is string => label.length > 0);
  const ordered = Array.from(
    new Map(
      weekdays
        .map((label) => WEEKDAY_ORDER.find((entry) => entry.labels.includes(label.toLowerCase()))?.index)
        .filter((index): index is number => index !== undefined)
        .map((index) => [index, WEEKDAY_ORDER[index]?.labels[0] ?? ''] as const),
    ).values(),
  ).filter((label) => label.length > 0);
  return { weekdays: ordered, sourceRegex };
}

function normalizeWeekdayToken(raw: string): string {
  const lower = raw.toLowerCase();
  const match = WEEKDAY_ORDER.find((entry) =>
    entry.labels.some((label) => lower.startsWith(label.toLowerCase())),
  );
  return match?.labels[0] ?? '';
}

function makeStyles(theme: Theme) {
  return {
    content: {
      padding: space[5],
      paddingBottom: space[10],
      gap: space[4],
    },
    heroWrap: {
      borderRadius: radius['2xl'],
      overflow: 'hidden',
      backgroundColor: theme.accent.soft,
      minHeight: 280,
    },
    heroAvatarWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroAvatar: {
      width: 132,
      height: 132,
      borderRadius: radius['2xl'],
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bg,
    },
    heroAvatarText: {
      fontSize: 56,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -4,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      padding: space[4],
      justifyContent: 'space-between',
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    heroActions: {
      flexDirection: 'row',
      gap: space[2],
    },
    heroStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    heroLiveText: {
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
    },
    summaryCard: {
      backgroundColor: theme.bg,
      borderRadius: radius.xl,
      paddingHorizontal: space[4],
      paddingVertical: space[4],
      gap: space[4],
    },
    nameBlock: {
      gap: space[1],
    },
    name: {
      fontSize: 30,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -1,
    },
    address: {
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    statsRow: {
      flexDirection: 'row',
      gap: space[3],
    },
    statItem: {
      flex: 1,
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      padding: space[3],
      gap: space[1],
    },
    statLabel: {
      fontSize: 12,
      fontWeight: fontWeight.bold,
      color: theme.text3,
    },
    statValue: {
      fontSize: 20,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    sectionCard: {
      gap: space[3],
      backgroundColor: theme.bg,
      borderRadius: radius.xl,
      paddingHorizontal: space[4],
      paddingVertical: space[3],
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.5,
    },
    sectionSub: {
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      marginTop: -space[2],
    },
    sessionWrap: {
      gap: space[3],
    },
    sessionMetaRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    sessionMetaLabel: {
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.text3,
    },
    sessionMetaValue: {
      fontSize: 18,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    sessionChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space[1],
      height: 180,
      paddingTop: space[2],
    },
    barCell: {
      flex: 1,
      alignItems: 'center',
      gap: space[1],
    },
    barCount: {
      fontSize: 12,
      fontWeight: fontWeight.extrabold,
      color: theme.text2,
    },
    barTrack: {
      width: '100%',
      flex: 1,
      justifyContent: 'flex-end',
      borderRadius: radius.full,
      backgroundColor: theme.subtle,
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      borderRadius: radius.full,
      backgroundColor: theme.accent.base,
    },
    barLabel: {
      fontSize: 12,
      fontWeight: fontWeight.bold,
      color: theme.text3,
    },
    activityList: {
      gap: space[2],
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      padding: space[3],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 16,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    activityBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    activityName: {
      fontSize: 15,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    activityTime: {
      fontSize: 12,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    activityMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    activityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.semantic.danger,
    },
    metaCard: {
      gap: space[4],
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      padding: space[4],
    },
    metaSection: {
      gap: space[2],
    },
    metaRow: {
      gap: space[1],
    },
    metaBlock: {
      gap: space[1],
      marginTop: -space[1],
    },
    metaLabel: {
      fontSize: 12,
      fontWeight: fontWeight.bold,
      color: theme.text3,
    },
    metaValue: {
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text,
    },
    metaValueMultiline: {
      fontSize: 13,
      lineHeight: 19,
    },
    metaValueLine: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.text,
      fontWeight: fontWeight.semibold,
    },
    featureChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
    },
    infoBox: {
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      padding: space[4],
    },
    infoText: {
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.text3,
      textAlign: 'center',
      paddingVertical: space[4],
    },
    errorBox: {
      backgroundColor: theme.semantic.danger + '14',
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontSize: 14,
      fontWeight: fontWeight.extrabold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontSize: 13,
      color: theme.text2,
    },
    routeList: {
      gap: space[2],
    },
    loadMore: {
      marginTop: space[2],
    },
    sectionLoading: {
      gap: space[2],
    },
    pressIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.94)',
    },
  } as const;
}

function makeRouteStyles(theme: Theme) {
  return {
    card: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: space[3],
      padding: space[3],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
    },
    leading: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: space[2],
    },
    main: {
      flex: 1,
      gap: space[0.5],
      minWidth: 0,
    },
    name: {
      fontSize: 15,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    meta: {
      fontSize: 12,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
  };
}
