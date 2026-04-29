import { StyleSheet } from 'react-native';

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

export function makeGymSearchStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
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
      borderRadius: radius.lg,
      paddingHorizontal: space[4],
      paddingVertical: space[3],
    },
    searchInput: {
      flex: 1,
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text,
      letterSpacing: -0.15,
      padding: 0,
    },
    searchClear: {
      padding: space[1],
    },
    chipScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    chipRow: {
      paddingHorizontal: space[5],
      paddingBottom: space[3],
      gap: space[2],
      flexDirection: 'row',
    },
    content: {
      paddingHorizontal: space[5],
      paddingBottom: space[10],
    },
    flexContent: {
      flexGrow: 1,
    },
    errorBox: {
      marginHorizontal: space[5],
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
    footer: {
      paddingVertical: space[4],
      alignItems: 'center',
    },
  });
}

export function makeGymCardStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      padding: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      gap: space[2],
      ...shadow.xs,
    },
    pressed: {
      opacity: 0.85,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: space[2],
    },
    name: {
      flex: 1,
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    brand: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.accent.ink,
    },
    address: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
  });
}

export function makeGymEmptyStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[2],
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
      fontSize: fontSize.title,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
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
  });
}
