import { Platform, StyleSheet } from 'react-native';

import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';

export function makeOnboardingGymStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    header: {
      paddingHorizontal: space[5],
      paddingTop: space[4],
      paddingBottom: space[3],
    },
    title: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.h1,
      color: theme.text,
    },
    subtitle: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text2,
      marginTop: space[2],
      lineHeight: fontSize.body * 1.4,
    },
    searchWrap: {
      paddingHorizontal: space[5],
      paddingBottom: space[3],
    },
    searchField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      backgroundColor: theme.subtle,
      borderRadius: radius.md,
      paddingHorizontal: space[3],
      paddingVertical: Platform.OS === 'ios' ? space[2] : 0,
    },
    searchInput: {
      flex: 1,
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text,
    },
    searchClear: {
      padding: space[1],
    },
    listWrap: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: space[5],
      paddingBottom: space[3],
    },
    flexContent: {
      flexGrow: 1,
      paddingHorizontal: space[5],
      justifyContent: 'center',
    },
    skeletonBlock: {
      paddingHorizontal: space[5],
    },
    errorBox: {
      marginHorizontal: space[5],
      padding: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
    },
    errorTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
      marginBottom: space[1],
    },
    errorBody: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text2,
    },
    ctaBlock: {
      paddingHorizontal: space[5],
      paddingTop: space[3],
      paddingBottom: space[3],
      gap: space[3],
    },
    confirmCta: {
      backgroundColor: theme.accent.base,
      borderRadius: radius.lg,
      paddingVertical: space[4],
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmCtaDisabled: {
      opacity: 0.5,
    },
    confirmCtaPressed: {
      opacity: 0.85,
    },
    confirmLabel: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.accent.ink,
    },
    skipCta: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space[2],
    },
    skipCtaPressed: {
      opacity: 0.6,
    },
    skipLabel: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text3,
    },
  });
}

export function makeOnboardingGymRowStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingHorizontal: space[3],
      paddingVertical: space[3],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    rowActive: {
      borderColor: theme.accent.base,
      backgroundColor: theme.bg,
    },
    rowPressed: {
      opacity: 0.7,
    },
    rowMain: {
      flex: 1,
    },
    name: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.text,
    },
    address: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
      marginTop: 2,
    },
  });
}

export function makeOnboardingGymEmptyStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space[6],
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space[3],
    },
    title: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.text,
    },
    body: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
      marginTop: space[1],
      textAlign: 'center',
    },
  });
}
