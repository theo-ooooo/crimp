import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Chip,
  GradeBadge,
  HoldDot,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
} from '@/components/primitives';
import { useGymQuery, useGymRoutesQuery } from '@/hooks/useGyms';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  shadow,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { GymDetail, RouteItem } from '@/lib/schemas/gym';
import type { HoldColorKey } from '@/components/primitives';
import type { RootStackNavigationProp, RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 암장 상세 화면.
 *
 * - 헤더: 이름 + 브랜드 Chip + 주소
 * - 메타 카드: phone / openingHoursJson / settingCycleDays / featuresJson
 * - 활성 루트 섹션 (token 있으면 useGymRoutesQuery)
 * - 하단 PrimaryButton "이 암장에서 세션 시작"
 */
export default function GymDetailScreen(): JSX.Element {
  const theme = useTokens();
  const route = useRoute<RouteProp<RootStackParamList, 'GymDetail'>>();
  const navigation = useNavigation<RootStackNavigationProp<'GymDetail'>>();
  const { extId } = route.params;

  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);

  const gymQuery = useGymQuery(extId);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  const gym = gymQuery.data;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {gymQuery.isLoading ? (
          <>
            <Skeleton height={120} radius={radius.xl} />
            <View style={{ height: space[4] }} />
            <Skeleton height={180} radius={radius.xl} />
          </>
        ) : gymQuery.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>{t('gym.detail.errorTitle')}</Text>
            <Text style={styles.errorBody}>
              {toUserMessage(gymQuery.error)}
            </Text>
          </View>
        ) : gym ? (
          <>
            <GymHeader gym={gym} />
            <GymMetaCard gym={gym} />
            <RoutesSection
              gymExtId={extId}
              accessToken={accessToken}
            />
          </>
        ) : null}
      </ScrollView>

      {gym ? (
        <View style={styles.bottomBar}>
          <PrimaryButton
            onPress={() =>
              navigation.navigate('StartSession', {
                gymExtId: gym.extId,
                gymName: gym.name,
              })
            }
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
  const styles = useMemo(() => makeHeaderStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.name}>{gym.name}</Text>
      <View style={styles.brandRow}>
        <Chip label={gym.brand ?? t('gym.detail.brandFallback')} />
      </View>
      <Text style={styles.address}>
        {gym.address ?? t('gym.detail.addressFallback')}
      </Text>
    </View>
  );
}

function GymMetaCard({ gym }: { gym: GymDetail }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeMetaStyles(theme), [theme]);

  const openingHours = prettyPrintJson(gym.openingHoursJson);
  const features = prettyPrintJson(gym.featuresJson);

  return (
    <View style={styles.card}>
      <MetaRow label={t('gym.detail.metaPhone')} value={gym.phone} />
      <MetaRow
        label={t('gym.detail.metaHours')}
        value={openingHours}
        multiline
      />
      <MetaRow
        label={t('gym.detail.metaCycle')}
        value={
          gym.settingCycleDays !== null
            ? `${gym.settingCycleDays} ${t('gym.detail.metaCycleUnit')}`
            : null
        }
      />
      <MetaRow
        label={t('gym.detail.metaFeatures')}
        value={features}
        multiline
      />
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
  const styles = useMemo(() => makeMetaStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[styles.value, multiline ? styles.valueMultiline : null]}
        numberOfLines={multiline ? undefined : 2}
      >
        {value && value.length > 0 ? value : t('gym.detail.metaEmpty')}
      </Text>
    </View>
  );
}

function RoutesSection({
  gymExtId,
  accessToken,
}: {
  gymExtId: string;
  accessToken: string | null;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeRoutesStyles(theme), [theme]);

  const {
    data,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGymRoutesQuery(accessToken, accessToken ? gymExtId : null);

  const routes: RouteItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{t('gym.detail.routesTitle')}</Text>

      {!accessToken ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {t('gym.detail.routesLoginRequired')}
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.list}>
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            {t('gym.detail.routesErrorTitle')}
          </Text>
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
          {hasNextPage ? (
            <View style={styles.loadMore}>
              <SecondaryButton
                onPress={() => {
                  fetchNextPage().catch(() => {
                    /* 페이지 실패 무시 — 상위 error 로 이어지지 않음 */
                  });
                }}
                disabled={isFetchingNextPage}
              >
                {t('gym.detail.routesLoadMore')}
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
  const styles = useMemo(() => makeRouteCardStyles(theme), [theme]);

  const holdColor: HoldColorKey | string = normalizeHoldColor(route.color);
  const gradeLabel = route.gradeValue ?? '';

  return (
    <View style={styles.card}>
      <View style={styles.leading}>
        <HoldDot color={holdColor} size={18} />
        {gradeLabel.length > 0 ? (
          <GradeBadge v={gradeLabel} size="sm" />
        ) : null}
      </View>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {route.name ?? gradeLabel}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {t('gym.detail.routeSetterPrefix')} ·{' '}
          {route.setter ?? t('gym.detail.routeSetterUnknown')}
          {route.setAt
            ? `  ·  ${t('gym.detail.routeSetAtPrefix')} ${route.setAt}`
            : ''}
        </Text>
      </View>
    </View>
  );
}

/**
 * 백엔드에서 내려오는 색상 문자열을 HoldDot 이 인식하는 키로 안전하게 매핑.
 * 매핑 안되는 값은 HoldDot 의 fallback (raw string) 으로 전달 → 원본 hex 나 이름이 그대로 렌더링.
 */
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
    // 한글 매핑
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

/**
 * JSON 문자열이 오면 pretty print, 아니면 그대로 반환. null 은 null 로 패스.
 */
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    content: {
      padding: space[5],
      paddingBottom: space[10],
      gap: space[5],
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[2],
    },
    muted: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text3,
    },
    errorBox: {
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    bottomBar: {
      paddingHorizontal: space[5],
      paddingTop: space[3],
      paddingBottom: space[5],
      backgroundColor: theme.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.hairline,
    },
  });
}

function makeHeaderStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      gap: space[2],
    },
    name: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.h1,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    address: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text2,
      letterSpacing: -0.15,
    },
  });
}

function makeMetaStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      padding: space[5],
      gap: space[4],
      ...shadow.xs,
    },
    row: {
      gap: space[1],
    },
    label: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      letterSpacing: -0.12,
    },
    value: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text,
      letterSpacing: -0.15,
    },
    valueMultiline: {
      fontFamily,
      fontSize: 13,
      lineHeight: 19,
    },
  });
}

function makeRoutesStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      gap: space[3],
    },
    sectionTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    list: {
      gap: space[2],
    },
    infoBox: {
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      padding: space[4],
    },
    infoText: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      textAlign: 'center',
    },
    empty: {
      fontFamily,
      fontSize: 14,
      color: theme.text3,
      textAlign: 'center',
      paddingVertical: space[5],
    },
    errorBox: {
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    loadMore: {
      marginTop: space[2],
    },
  });
}

function makeRouteCardStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      padding: space[3],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
    },
    leading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    main: {
      flex: 1,
      gap: space[0.5],
    },
    name: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.text,
      letterSpacing: -0.15,
    },
    meta: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
  });
}
