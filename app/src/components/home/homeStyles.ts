import { StyleSheet } from 'react-native';

import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';

export function makeHomeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[3],
    },
    scrollContent: {
      paddingHorizontal: space[5],
      paddingTop: space[6],
      paddingBottom: space[14],
      gap: space[6],
    },
    muted: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text3,
    },
    brand: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h1,
      color: theme.text,
    },
    heroTagline: {
      fontFamily,
      fontSize: fontSize.h2,
      fontWeight: fontWeight.bold,
      color: theme.text,
      textAlign: 'center',
    },
    heroDescription: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text2,
      textAlign: 'center',
    },
    heroButton: {
      alignSelf: 'stretch',
      marginTop: space[4],
    },
    loginPrompt: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
    },
    greetingBlock: {
      gap: space[1],
    },
    eyebrow: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      marginBottom: space[1],
    },
    greeting: {
      fontFamily,
      fontSize: fontSize.h2,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h2,
      color: theme.text,
      lineHeight: fontSize.h2 * 1.15,
    },
    greetingAccent: {
      color: theme.accent.base,
    },
    statsCard: {
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      paddingVertical: space[6],
      paddingHorizontal: space[5],
      gap: space[3],
    },
    statsCardCaption: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    statsCardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    statsCardLeft: {
      flexShrink: 1,
      gap: space[1],
    },
    statsCardRight: {
      alignItems: 'flex-end',
      gap: space[1],
    },
    statsBigNumber: {
      fontFamily,
      fontSize: 56,
      fontWeight: fontWeight.extrabold,
      letterSpacing: -2.8,
      lineHeight: 56,
      color: theme.text,
      includeFontPadding: false,
    },
    statsTopGrade: {
      fontFamily,
      fontSize: 32,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h1,
      lineHeight: 32,
      color: theme.accent.base,
      includeFontPadding: false,
    },
    statsCardSubLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      marginTop: space[1],
    },
    errorBox: {
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.lg,
      padding: space[5],
      gap: space[2],
    },
    errorTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    emptyBlock: {
      alignItems: 'center',
      padding: space[8],
      gap: space[3],
    },
    emptyTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.title,
      color: theme.text,
      marginTop: space[2],
    },
    recentBlock: {
      gap: space[3],
    },
    recentHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.title,
      color: theme.text,
    },
    recentSeeAllPress: {
      paddingVertical: space[1],
    },
    recentSeeAllPressed: {
      opacity: 0.6,
    },
    recentSeeAllLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    recentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.hairline,
    },
    recentCardPressed: {
      opacity: 0.85,
    },
    recentCardIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recentCardBody: {
      flex: 1,
      minWidth: 0,
    },
    recentCardLabel: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.body,
      color: theme.text,
    },
    recentCardDate: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      marginTop: 2,
    },
  });
}
