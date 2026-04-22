import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/primitives';
import { fontFamily, space } from '@/lib/tokens';
import type { Theme } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

import {
  ButtonSection,
  GradeBadgeSection,
  ResultMarkSection,
  HoldDotSection,
  BigStatSection,
  SkeletonSection,
  IconSection,
} from './design/DesignSections';

/**
 * 디자인 프리미티브 미리보기 화면.
 * 라이트/다크 테마는 시스템 Appearance 자동 반영.
 * 네비 메뉴 미등록 — 딥링크/개발 모드 전용.
 */
export default function DesignPrimitivesScreen(): JSX.Element {
  const theme = useTokens();
  const [chipActive, setChipActive] = useState<string>('all');

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <Section theme={theme} title="Button">
        <ButtonSection />
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
        <GradeBadgeSection />
      </Section>

      <Section theme={theme} title="ResultMark">
        <ResultMarkSection theme={theme} />
      </Section>

      <Section theme={theme} title="HoldDot">
        <HoldDotSection theme={theme} />
      </Section>

      <Section theme={theme} title="BigStat">
        <BigStatSection theme={theme} />
      </Section>

      <Section theme={theme} title="Skeleton">
        <SkeletonSection />
      </Section>

      <Section theme={theme} title="Icon">
        <IconSection theme={theme} />
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
  theme: Theme;
}): JSX.Element {
  return (
    <View>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <View style={{ marginTop: space[3] }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: space[5], paddingBottom: space[10], gap: space[6] },
  sectionTitle: { fontFamily, fontSize: 18, fontWeight: '700', letterSpacing: -0.36 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
});
