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
      gap: space[3],
    },
    headerStack: {
      gap: space[4],
      paddingTop: space[2],
    },
    titleBlock: {
      gap: space[1],
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
    title: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.h1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[2],
    },
    sectionTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    sortChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1],
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radius.full,
      backgroundColor: theme.subtle,
    },
    sortChipText: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
    },
    mapSection: {
      gap: space[3],
    },
    mapLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    mapLabel: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    mapSub: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
  });
}

export function makeGymCardStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      padding: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      ...shadow.xs,
    },
    pressed: {
      opacity: 0.85,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: radius.lg,
      backgroundColor: theme.accent.soft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    body: {
      flex: 1,
      minWidth: 0,
      gap: space[1],
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[2],
    },
    name: {
      flex: 1,
      fontFamily,
      fontSize: 17,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    brand: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.bold,
      color: theme.semantic.success,
      paddingHorizontal: space[2],
      paddingVertical: 2,
      borderRadius: radius.full,
      backgroundColor: '#DDF5EE',
      overflow: 'hidden',
    },
    address: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      flexWrap: 'wrap',
    },
    metaText: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
    },
    metaDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.text4,
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
