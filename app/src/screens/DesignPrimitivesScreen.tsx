import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BigStat,
  Chip,
  CrimpIcon,
  GradeBadge,
  HoldDot,
  PrimaryButton,
  ResultMark,
  SecondaryButton,
  Skeleton,
  type ResultKind,
} from '@/components/primitives';
import { fontFamily, space } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

/**
 * 디자인 프리미티브 미리보기 화면.
 * - 라이트/다크 테마는 시스템 Appearance 에 따라 자동 전환.
 * - 네비게이션 메뉴에는 등록하지 않고 딥링크/개발 모드로만 진입.
 */
export default function DesignPrimitivesScreen(): JSX.Element {
  const theme = useTokens();
  const [chipActive, setChipActive] = useState<string>('all');

  const resultKinds: ResultKind[] = ['SEND', 'FLASH', 'ONSIGHT', 'TRY', 'FAIL'];
  const holdColors = [
    'red',
    'blue',
    'yellow',
    'green',
    'white',
    'black',
    'pink',
    'orange',
    'purple',
    'gray',
  ] as const;
  const grades = ['V0', 'V2', 'V4', 'V6', 'V8', 'V10'];
  const iconNames = Object.keys(CrimpIcon) as Array<keyof typeof CrimpIcon>;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <Section theme={theme} title="Button">
        <PrimaryButton onPress={() => undefined}>세션 시작하기</PrimaryButton>
        <View style={{ height: space[3] }} />
        <SecondaryButton onPress={() => undefined}>취소</SecondaryButton>
        <View style={{ height: space[3] }} />
        <PrimaryButton disabled onPress={() => undefined}>
          비활성화
        </PrimaryButton>
      </Section>

      <Section theme={theme} title="Chip">
        <View style={styles.row}>
          {(['all', 'bouldering', 'lead'] as const).map((k) => (
            <Chip
              key={k}
              label={k === 'all' ? '전체' : k === 'bouldering' ? '볼더링' : '리드'}
              active={chipActive === k}
              onPress={() => setChipActive(k)}
            />
          ))}
        </View>
      </Section>

      <Section theme={theme} title="GradeBadge">
        <View style={styles.row}>
          {grades.map((g) => (
            <GradeBadge key={`sm-${g}`} v={g} size="sm" />
          ))}
        </View>
        <View style={[styles.row, { marginTop: space[2] }]}>
          {grades.map((g) => (
            <GradeBadge key={`md-${g}`} v={g} size="md" />
          ))}
        </View>
        <View style={[styles.row, { marginTop: space[2] }]}>
          {grades.map((g) => (
            <GradeBadge key={`lg-${g}`} v={g} size="lg" />
          ))}
        </View>
      </Section>

      <Section theme={theme} title="ResultMark">
        <View style={styles.row}>
          {resultKinds.map((k) => (
            <View key={k} style={styles.cell}>
              <ResultMark kind={k} size={32} />
              <Text style={[styles.caption, { color: theme.text3 }]}>{k}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section theme={theme} title="HoldDot">
        <View style={styles.row}>
          {holdColors.map((c) => (
            <View key={c} style={styles.cell}>
              <HoldDot color={c} size={20} />
              <Text style={[styles.caption, { color: theme.text3 }]}>{c}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section theme={theme} title="BigStat">
        <View style={styles.statRow}>
          <BigStat value={12} label="이번 주 세션" scale="md" />
          <BigStat value={87} label="총 완등" scale="md" />
          <BigStat value="V5" label="최고 그레이드" scale="md" />
        </View>
        <View style={{ height: space[4] }} />
        <BigStat value={140} label="누적 시도" scale="lg" unit="회" />
        <View style={{ height: space[4] }} />
        <BigStat
          value={9}
          label="오늘의 완등"
          scale="xl"
          align="center"
          accent={theme.accent.base}
        />
      </Section>

      <Section theme={theme} title="Skeleton">
        <Skeleton width="80%" height={18} />
        <View style={{ height: space[2] }} />
        <Skeleton width="60%" height={14} />
        <View style={{ height: space[2] }} />
        <Skeleton width={80} height={80} radius={40} />
      </Section>

      <Section theme={theme} title="Icon">
        <View style={styles.row}>
          {iconNames.map((name) => {
            const IconComp = CrimpIcon[name];
            return (
              <View key={name} style={styles.iconCell}>
                <IconComp size={24} color={theme.text} />
                <Text style={[styles.caption, { color: theme.text3 }]}>{name}</Text>
              </View>
            );
          })}
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTokens>;
}): JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <View style={{ marginTop: space[3] }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: space[5],
    paddingBottom: space[10],
    gap: space[6],
  },
  section: {},
  sectionTitle: {
    fontFamily,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.36,
  },
  caption: {
    fontFamily,
    fontSize: 11,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space[3],
  },
  cell: {
    alignItems: 'center',
    gap: 4,
  },
  iconCell: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
});
