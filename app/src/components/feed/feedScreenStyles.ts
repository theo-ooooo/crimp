import { StyleSheet } from 'react-native';

import {
  fontFamily,
  fontWeight,
  radius,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';

export function makeFeedStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
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
    listContent: {
      paddingTop: space[1],
      paddingBottom: space[10],
    },
    list: {},
    body: {
      flex: 1,
    },
    flexContent: {
      flexGrow: 1,
    },
    emptyListContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingTop: 0,
      paddingBottom: 0,
    },
    cardWrap: {
      marginHorizontal: space[5],
      marginBottom: space[3],
    },
    skeletonWrap: {
      paddingHorizontal: space[5],
      paddingTop: space[1],
      gap: space[3],
    },
    footer: {
      paddingVertical: space[4],
      alignItems: 'center',
    },
  });
}

export function makeFeedErrorStyles(theme: Theme) {
  return StyleSheet.create({
    box: {
      marginHorizontal: space[5],
      marginTop: space[3],
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[2],
    },
    title: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    body: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    retry: {
      alignSelf: 'flex-start',
      marginTop: space[1],
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radius.md,
      backgroundColor: theme.text,
    },
    retryPressed: {
      opacity: 0.85,
    },
    retryLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.bg,
    },
  });
}

export function makeFeedEmptyStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      padding: space[6],
      gap: space[2],
    },
    title: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: theme.text,
      textAlign: 'center',
    },
    body: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      textAlign: 'center',
      maxWidth: 280,
      lineHeight: 20,
    },
  });
}
