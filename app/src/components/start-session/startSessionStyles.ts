import { StyleSheet } from 'react-native';

import {
  fontFamily,
  fontWeight,
  letterSpacing,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';

export function makeStartSessionStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: space[5],
      paddingBottom: space[10],
      gap: space[5],
    },
    hero: {
      gap: space[2],
      marginTop: space[3],
    },
    eyebrow: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.accent.base,
      letterSpacing: 0.26,
    },
    title: {
      fontFamily,
      fontSize: 28,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.h2,
      lineHeight: 32,
    },
    subtitle: {
      fontFamily,
      fontSize: 15,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      letterSpacing: -0.15,
    },
    field: {
      gap: space[2],
    },
    label: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      letterSpacing: -0.13,
    },
    input: {
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      paddingHorizontal: space[4],
      paddingVertical: space[4],
      fontFamily,
      fontSize: 17,
      fontWeight: fontWeight.medium,
      color: theme.text,
      letterSpacing: -0.34,
    },
    hint: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[2],
    },
    heading: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    muted: {
      fontFamily,
      fontSize: 14,
      color: theme.text3,
    },
    errorBox: {
      backgroundColor: `${theme.semantic.danger}14`,
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
    bottomBar: {
      paddingHorizontal: space[5],
      paddingTop: space[3],
      paddingBottom: space[5],
      backgroundColor: theme.bg,
    },
    pendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
      height: 56,
    },
    pendingLabel: {
      fontFamily,
      fontSize: 15,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    selectedGymCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      paddingHorizontal: space[4],
      paddingVertical: space[4],
    },
    selectedGymText: {
      flex: 1,
      gap: space[1],
    },
    selectedGymLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      letterSpacing: -0.13,
    },
    selectedGymName: {
      fontFamily,
      fontSize: 17,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: -0.34,
    },
    clearButton: {
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radius.full,
      backgroundColor: theme.bg,
    },
    clearButtonPressed: {
      opacity: 0.7,
    },
    clearButtonLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
    },
  });
}
