import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  Chip,
  GradeBadge,
  HoldDot,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
} from '@/components/common/primitives';
import type { HoldColorKey } from '@/components/common/primitives';
import {
  makeGymDetailStyles,
  makeGymHeaderStyles,
  makeGymMetaStyles,
  makeGymRouteCardStyles,
  makeGymRoutesStyles,
} from '@/components/gym/gymDetailStyles';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { radius, space, type Theme } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { GymDetail, RouteItem } from '@/lib/schemas/gym';

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
  hasMoreRoutes: boolean;
  isFetchingMoreRoutes: boolean;
  onLoadMoreRoutes: () => void;
  onStartSession: (gym: GymDetail) => void;
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
  hasMoreRoutes,
  isFetchingMoreRoutes,
  onLoadMoreRoutes,
  onStartSession,
}: Props): JSX.Element {
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {gymLoading ? (
          <>
            <Skeleton height={120} radius={radius.xl} />
            <View style={{ height: space[4] }} />
            <Skeleton height={180} radius={radius.xl} />
          </>
        ) : gymError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>{t('gym.detail.errorTitle')}</Text>
            <Text style={styles.errorBody}>{toUserMessage(gymError)}</Text>
          </View>
        ) : gym ? (
          <>
            <GymHeader gym={gym} />
            <GymMetaCard gym={gym} />
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

function GymHeader({ gym }: { gym: GymDetail }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeGymHeaderStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.name}>{gym.name}</Text>
      <View style={styles.brandRow}>
        <Chip label={gym.brand ?? t('gym.detail.brandFallback')} />
      </View>
      <Text style={styles.address}>{gym.address ?? t('gym.detail.addressFallback')}</Text>
    </View>
  );
}

type MetaStyles = ReturnType<typeof makeGymMetaStyles>;

function GymMetaCard({ gym }: { gym: GymDetail }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeGymMetaStyles(theme), [theme]);

  const openingHours = prettyPrintJson(gym.openingHoursJson);
  const features = prettyPrintJson(gym.featuresJson);

  return (
    <View style={styles.card}>
      <MetaRow styles={styles} label={t('gym.detail.metaPhone')} value={gym.phone} />
      <MetaRow styles={styles} label={t('gym.detail.metaHours')} value={openingHours} multiline />
      <MetaRow
        styles={styles}
        label={t('gym.detail.metaCycle')}
        value={gym.settingCycleDays !== null ? `${gym.settingCycleDays} ${t('gym.detail.metaCycleUnit')}` : null}
      />
      <MetaRow styles={styles} label={t('gym.detail.metaFeatures')} value={features} multiline />
    </View>
  );
}

function MetaRow({
  styles,
  label,
  value,
  multiline = false,
}: {
  styles: MetaStyles;
  label: string;
  value: string | null;
  multiline?: boolean;
}): JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, multiline ? styles.valueMultiline : null]} numberOfLines={multiline ? undefined : 2}>
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
  const styles = useMemo(() => makeGymRoutesStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{t('gym.detail.routesTitle')}</Text>

      {!accessToken ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{t('gym.detail.routesLoginRequired')}</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.list}>
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
        <Text style={styles.empty}>{t('gym.detail.routesEmpty')}</Text>
      ) : (
        <>
          <View style={styles.list}>
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
  const styles = useMemo(() => makeGymRouteCardStyles(theme), [theme]);

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

function prettyPrintJson(raw: string | null): string | null {
  if (raw === null || raw.length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') {
      return String(parsed);
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}
