import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/common/primitives';
import {
  BigStatSection,
  ButtonSection,
  GradeBadgeSection,
  HoldDotSection,
  IconSection,
  ResultMarkSection,
  SkeletonSection,
} from '@/components/design/DesignSections';
import { fontFamily, space, type Theme } from '@/lib/tokens';

type Props = {
  theme: Theme;
  chipActive: string;
  setChipActive: (value: string) => void;
};

export function DesignPrimitivesBody({ theme, chipActive, setChipActive }: Props): JSX.Element {
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
