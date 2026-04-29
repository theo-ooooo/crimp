import { StyleSheet } from 'react-native';

import {
  fontFamily,
  fontWeight,
  radius,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';

export function makeSessionDetailStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: {
      padding: space[5],
      paddingBottom: space[10],
      gap: space[5],
    },
    uploadingOverlay: {
      flex: 1,
      backgroundColor: withAlpha(theme.bg, 0.85),
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[3],
    },
    uploadingLabel: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text,
    },
    sectionTitle: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: -0.36,
    },
    sectionCount: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    timelineHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    timelineList: {
      gap: space[2],
    },
    errorBox: {
      backgroundColor: `${theme.semantic.danger}14`,
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    endWrap: {
      gap: space[2],
      alignItems: 'stretch',
    },
    logCtaWrap: {
      alignItems: 'stretch',
    },
  });
}
