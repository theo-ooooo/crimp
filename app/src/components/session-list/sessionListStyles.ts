import { Platform, StyleSheet } from 'react-native';

import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  shadow,
  space,
  touchTarget,
  type Theme,
} from '@/lib/tokens';

export const TABULAR_NUMS = Platform.select<Array<'tabular-nums'>>({
  ios: ['tabular-nums'],
  android: [],
  default: [],
}) as Array<'tabular-nums'>;

export function makeSessionListStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    headerActionRow: {
      paddingHorizontal: space[5],
      paddingTop: space[3],
      paddingBottom: space[2],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    content: {
      paddingHorizontal: space[5],
      paddingBottom: space[10],
    },
    flexContent: {
      flexGrow: 1,
    },
    summaryCard: {
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      padding: space[5],
      marginBottom: space[4],
      ...shadow.xs,
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
      textAlign: 'center',
    },
    errorBox: {
      marginHorizontal: space[5],
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
    footer: {
      paddingVertical: space[4],
      alignItems: 'center',
    },
    iconAction: {
      width: touchTarget.min,
      height: touchTarget.min,
      borderRadius: radius.full,
      backgroundColor: theme.chip,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconActionPressed: {
      opacity: 0.85,
    },
  });
}

export function makeSessionCardStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: space[4],
      padding: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      ...shadow.xs,
    },
    pressed: {
      opacity: 0.85,
    },
    left: {
      justifyContent: 'center',
      gap: space[1],
      minWidth: 88,
    },
    durationLabel: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      letterSpacing: -0.12,
    },
    durationValue: {
      fontFamily,
      fontSize: 28,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.84,
      fontVariant: TABULAR_NUMS,
      includeFontPadding: false,
    },
    right: {
      flex: 1,
      justifyContent: 'space-between',
      gap: space[1],
    },
    gymName: {
      fontFamily,
      fontSize: 15,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: -0.3,
    },
    startTime: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      marginTop: space[1],
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.accent.base,
    },
    badgeLabel: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.bold,
      letterSpacing: -0.12,
    },
  });
}

export function makeSessionListEmptyStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[3],
    },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space[2],
    },
    title: {
      fontFamily,
      fontSize: 22,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.66,
      textAlign: 'center',
    },
    body: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 280,
    },
    cta: {
      width: '100%',
      maxWidth: 360,
      marginTop: space[4],
    },
  });
}

export type SessionListStyles = ReturnType<typeof makeSessionListStyles>;
