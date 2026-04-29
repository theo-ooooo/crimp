import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  BigStat,
  CrimpIcon,
  GradeBadge,
  HoldDot,
  PrimaryButton,
  ResultMark,
  SecondaryButton,
  Skeleton,
  type ResultKind,
} from '@/components/common/primitives';
import { fontFamily, space } from '@/lib/tokens';
import type { Theme } from '@/lib/tokens';

const RESULT_KINDS: ResultKind[] = ['SEND', 'FLASH', 'ONSIGHT', 'TRY', 'FAIL'];
const HOLD_COLORS = [
  'red', 'blue', 'yellow', 'green', 'white',
  'black', 'pink', 'orange', 'purple', 'gray',
] as const;
const GRADES = ['V0', 'V2', 'V4', 'V6', 'V8', 'V10'];

export function ButtonSection(): JSX.Element {
  return (
    <>
      <PrimaryButton onPress={() => undefined}>세션 시작하기</PrimaryButton>
      <View style={{ height: space[3] }} />
      <SecondaryButton onPress={() => undefined}>취소</SecondaryButton>
      <View style={{ height: space[3] }} />
      <PrimaryButton disabled onPress={() => undefined}>비활성화</PrimaryButton>
    </>
  );
}

export function GradeBadgeSection(): JSX.Element {
  return (
    <>
      {(['sm', 'md', 'lg'] as const).map((sz) => (
        <View key={sz} style={[styles.row, sz !== 'sm' ? { marginTop: space[2] } : null]}>
          {GRADES.map((g) => (
            <GradeBadge key={`${sz}-${g}`} v={g} size={sz} />
          ))}
        </View>
      ))}
    </>
  );
}

export function ResultMarkSection({ theme }: { theme: Theme }): JSX.Element {
  return (
    <View style={styles.row}>
      {RESULT_KINDS.map((k) => (
        <View key={k} style={styles.cell}>
          <ResultMark kind={k} size={32} />
          <Text style={[styles.caption, { color: theme.text3 }]}>{k}</Text>
        </View>
      ))}
    </View>
  );
}

export function HoldDotSection({ theme }: { theme: Theme }): JSX.Element {
  return (
    <View style={styles.row}>
      {HOLD_COLORS.map((c) => (
        <View key={c} style={styles.cell}>
          <HoldDot color={c} size={20} />
          <Text style={[styles.caption, { color: theme.text3 }]}>{c}</Text>
        </View>
      ))}
    </View>
  );
}

export function BigStatSection({ theme }: { theme: Theme }): JSX.Element {
  return (
    <>
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
    </>
  );
}

export function SkeletonSection(): JSX.Element {
  return (
    <>
      <Skeleton width="80%" height={18} />
      <View style={{ height: space[2] }} />
      <Skeleton width="60%" height={14} />
      <View style={{ height: space[2] }} />
      <Skeleton width={80} height={80} radius={40} />
    </>
  );
}

export function IconSection({ theme }: { theme: Theme }): JSX.Element {
  const iconNames = Object.keys(CrimpIcon) as Array<keyof typeof CrimpIcon>;
  return (
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
  );
}

const styles = StyleSheet.create({
  caption: { fontFamily, fontSize: 11, fontWeight: '500' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  cell: { alignItems: 'center', gap: 4 },
  iconCell: { alignItems: 'center', gap: 4, width: 56 },
});
