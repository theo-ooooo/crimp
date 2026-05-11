import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { Chip, CrimpIcon, Skeleton } from '@/components/common/primitives';
import {
  CREW_LEVEL_OPTIONS,
  CREW_STYLE_OPTIONS,
  useCrewListScreen,
} from '@/hooks/screens/useCrewListScreen';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t, type MessageKey } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type {
  CrewItem,
  CrewLevelBand,
  CrewMyStatus,
  CrewStyle,
} from '@/lib/schemas/crew';
import type { RootStackNavigationProp } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

export default function CrewListScreen(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="crew.loginRequiredTitle"
      loginDescriptionKey="crew.loginRequiredDescription"
    >
      {(token) => (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <CrewListContent accessToken={token} />
        </SafeAreaView>
      )}
    </AuthHydrationGate>
  );
}

function CrewListContent({ accessToken }: { accessToken: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<RootStackNavigationProp<'CrewList'>>();
  const state = useCrewListScreen(accessToken);

  const renderItem = useCallback<ListRenderItem<CrewItem>>(
    ({ item }) => (
      <CrewCard
        crew={item}
        onPress={() => navigation.navigate('CrewDetail', { extId: item.extId })}
      />
    ),
    [navigation],
  );

  const header = (
    <View style={styles.headerStack}>
      <View>
        <Text style={styles.eyebrow}>Crew</Text>
        <Text style={styles.title}>{t('crew.list.title')}</Text>
        <Text style={styles.subtitle}>{t('crew.list.subtitle')}</Text>
      </View>

      <View style={styles.searchField}>
        <CrimpIcon.search size={20} color={theme.text3} />
        <TextInput
          value={state.searchText}
          onChangeText={state.setSearchText}
          placeholder={t('crew.list.searchPlaceholder')}
          placeholderTextColor={theme.text4}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel={t('crew.list.searchAccessibilityLabel')}
        />
        {state.searchText.length > 0 ? (
          <Pressable
            onPress={() => state.setSearchText('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('crew.list.searchClearLabel')}
          >
            <CrimpIcon.close size={18} color={theme.text3} />
          </Pressable>
        ) : null}
      </View>

      <TextInput
        value={state.region}
        onChangeText={state.setRegion}
        placeholder={t('crew.list.regionPlaceholder')}
        placeholderTextColor={theme.text4}
        style={styles.regionInput}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      <FilterRow
        label={t('crew.list.levelFilterLabel')}
        options={CREW_LEVEL_OPTIONS}
        active={state.levelBand}
        onSelect={(next) => state.setLevelBand(state.levelBand === next ? null : next)}
      />
      <FilterRow
        label={t('crew.list.styleFilterLabel')}
        options={CREW_STYLE_OPTIONS}
        active={state.style}
        onSelect={(next) => state.setStyle(state.style === next ? null : next)}
      />
    </View>
  );

  if (state.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {header}
          <Skeleton height={126} radius={radius.xl} />
          <Skeleton height={126} radius={radius.xl} />
          <Skeleton height={126} radius={radius.xl} />
        </View>
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {header}
          <StateCard
            title={t('crew.list.errorTitle')}
            body={toUserMessage(state.error)}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={state.crews}
        keyExtractor={(item) => item.extId}
        contentContainerStyle={
          state.crews.length === 0 ? [styles.content, styles.flexContent] : styles.content
        }
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={header}
        ListEmptyComponent={(
          <StateCard
            title={t('crew.list.emptyTitle')}
            body={t('crew.list.emptyBody')}
          />
        )}
        renderItem={renderItem}
        refreshControl={(
          <RefreshControl
            refreshing={state.isRefetching}
            onRefresh={state.onRefresh}
            tintColor={theme.accent.base}
          />
        )}
        onEndReached={state.onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          state.isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={theme.accent.base} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

function FilterRow<T extends CrewLevelBand | CrewStyle>({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: Array<{ key: T; labelKey: string }>;
  active: T | null;
  onSelect: (next: T) => void;
}): JSX.Element {
  return (
    <View style={filterStyles.block}>
      <Text style={filterStyles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={filterStyles.row}
      >
        {options.map((opt) => (
          <Chip
            key={opt.key}
            label={t(opt.labelKey as MessageKey)}
            active={active === opt.key}
            onPress={() => onSelect(opt.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function CrewCard({ crew, onPress }: { crew: CrewItem; onPress: () => void }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${crew.name} ${t('crew.detail.title')}`}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardText}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{crew.name}</Text>
            <StatusBadge status={crew.myStatus} />
          </View>
          <Text style={styles.cardSummary} numberOfLines={2}>
            {crew.summary ?? t('crew.common.summaryFallback')}
          </Text>
        </View>
        <CrimpIcon.chevR size={20} color={theme.text3} />
      </View>
      <View style={styles.metaWrap}>
        <InfoChip label={crew.region ?? t('crew.common.regionFallback')} />
        <InfoChip label={crew.homeGym?.name ?? t('crew.common.homeGymFallback')} />
        <InfoChip label={levelLabel(crew.levelBand)} />
        <InfoChip label={styleLabel(crew.style)} />
      </View>
      <Text style={styles.memberText}>
        {formatMemberCount(crew.memberCount, crew.capacity)}
      </Text>
    </Pressable>
  );
}

function StatusBadge({ status }: { status: CrewMyStatus }): JSX.Element | null {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (status === 'NONE') {
    return null;
  }
  return (
    <View style={styles.statusBadge}>
      <Text style={styles.statusText}>{statusLabel(status)}</Text>
    </View>
  );
}

function InfoChip({ label }: { label: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.infoChip}>
      <Text style={styles.infoChipText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function StateCard({ title, body }: { title: string; body: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
    </View>
  );
}

function ItemSeparator(): JSX.Element {
  return <View style={{ height: space[3] }} />;
}

function levelLabel(v: CrewLevelBand): string {
  return t(`crew.level.${v}` as MessageKey);
}

function styleLabel(v: CrewStyle): string {
  return t(`crew.style.${v}` as MessageKey);
}

function statusLabel(v: CrewMyStatus): string {
  return t(`crew.status.${v}` as MessageKey);
}

function formatMemberCount(memberCount: number, capacity: number | null): string {
  const base = t('crew.common.memberCount').replace('{{count}}', String(memberCount));
  return capacity
    ? `${base} / ${t('crew.common.capacityCount').replace('{{count}}', String(capacity))}`
    : base;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      paddingHorizontal: space[5],
      paddingTop: space[6],
      paddingBottom: space[10],
      gap: space[3],
    },
    flexContent: {
      flexGrow: 1,
    },
    headerStack: {
      gap: space[3],
      marginBottom: space[2],
    },
    eyebrow: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.extrabold,
      color: theme.accent.ink,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: space[1],
    },
    title: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -1.28,
    },
    subtitle: {
      marginTop: space[1],
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      lineHeight: fontSize.body * 1.5,
    },
    searchField: {
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.hairline,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space[4],
      gap: space[2],
    },
    searchInput: {
      flex: 1,
      height: '100%',
      color: theme.text,
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      padding: 0,
    },
    regionInput: {
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: theme.bg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.hairline,
      color: theme.text,
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      paddingHorizontal: space[4],
    },
    card: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.hairline,
      borderRadius: radius.xl,
      backgroundColor: theme.bg,
      padding: space[4],
      gap: space[3],
    },
    cardPressed: {
      opacity: 0.82,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: space[2],
    },
    cardText: {
      flex: 1,
      minWidth: 0,
      gap: space[1],
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    cardTitle: {
      flex: 1,
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.36,
    },
    cardSummary: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text2,
      lineHeight: fontSize.body * 1.5,
    },
    metaWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
    },
    infoChip: {
      maxWidth: '100%',
      borderRadius: radius.full,
      backgroundColor: theme.chip,
      paddingHorizontal: space[3],
      paddingVertical: space[1],
    },
    infoChipText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text2,
    },
    statusBadge: {
      borderRadius: radius.full,
      backgroundColor: theme.accent.soft,
      paddingHorizontal: space[2],
      paddingVertical: space[1],
    },
    statusText: {
      fontFamily,
      fontSize: 11,
      fontWeight: fontWeight.extrabold,
      color: theme.accent.ink,
    },
    memberText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    stateCard: {
      borderRadius: radius.xl,
      backgroundColor: theme.subtle,
      padding: space[5],
      gap: space[2],
    },
    stateTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    stateBody: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text2,
      lineHeight: fontSize.body * 1.5,
    },
    footer: {
      paddingVertical: space[5],
    },
  });
}

const filterStyles = StyleSheet.create({
  block: {
    gap: space[1],
  },
  label: {
    fontFamily,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: '#8B95A1',
  },
  row: {
    gap: space[2],
    paddingRight: space[5],
  },
});
