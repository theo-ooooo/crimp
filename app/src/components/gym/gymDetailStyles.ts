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

export function makeGymDetailStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    content: {
      padding: space[5],
      paddingBottom: space[10],
      gap: space[5],
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[2],
    },
    muted: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text3,
    },
    errorBox: {
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
    bottomBar: {
      paddingHorizontal: space[5],
      paddingTop: space[3],
      paddingBottom: space[5],
      backgroundColor: theme.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.hairline,
    },
  });
}

export function makeGymHeaderStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      gap: space[2],
    },
    name: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.h1,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    address: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text2,
      letterSpacing: -0.15,
    },
  });
}

export function makeGymMetaStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      padding: space[5],
      gap: space[4],
      ...shadow.xs,
    },
    row: {
      gap: space[1],
    },
    label: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      letterSpacing: -0.12,
    },
    value: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text,
      letterSpacing: -0.15,
    },
    valueMultiline: {
      fontFamily,
      fontSize: 13,
      lineHeight: 19,
    },
  });
}

export function makeGymRoutesStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      gap: space[3],
    },
    sectionTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    list: {
      gap: space[2],
    },
    infoBox: {
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      padding: space[4],
    },
    infoText: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      textAlign: 'center',
    },
    empty: {
      fontFamily,
      fontSize: 14,
      color: theme.text3,
      textAlign: 'center',
      paddingVertical: space[5],
    },
    errorBox: {
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
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
    loadMore: {
      marginTop: space[2],
    },
  });
}

export function makeGymRouteCardStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      padding: space[3],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
    },
    leading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    main: {
      flex: 1,
      gap: space[0.5],
    },
    name: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.text,
      letterSpacing: -0.15,
    },
    meta: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
  });
}
