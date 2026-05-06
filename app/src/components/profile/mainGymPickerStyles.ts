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

export const mainGymPickerSeparatorStyles = StyleSheet.create({
  gap: { height: space[2] },
});

export function makeMainGymPickerModalStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withAlpha(theme.accent.ink, 0.5),
    },
    sheet: {
      backgroundColor: theme.bg,
      borderTopLeftRadius: radius['2xl'],
      borderTopRightRadius: radius['2xl'],
      paddingTop: space[3],
      paddingBottom: space[5],
      maxHeight: '92%',
      overflow: 'hidden',
    },
    handleBar: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.text4,
      alignSelf: 'center',
      marginBottom: space[4],
    },
    header: {
      paddingHorizontal: space[5],
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: space[3],
    },
    title: {
      fontFamily,
      fontSize: 22,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.66,
    },
    cancel: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    searchWrap: { paddingHorizontal: space[5], paddingBottom: space[3] },
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
      letterSpacing: letterSpacing.body,
      padding: 0,
    },
    searchClear: { padding: space[1] },
    content: { paddingHorizontal: space[5], paddingBottom: space[6] },
    flexContent: { flexGrow: 1 },
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
    errorBody: { fontFamily, fontSize: 13, color: theme.text2 },
    footer: { paddingVertical: space[4], alignItems: 'center' },
    actionFooter: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.hairline,
      paddingHorizontal: space[5],
      paddingTop: space[3],
      gap: space[2],
    },
    confirmButton: {
      minHeight: 52,
      borderRadius: radius.lg,
      backgroundColor: theme.accent.base,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: space[2],
    },
    confirmButtonPressed: { opacity: 0.88 },
    confirmButtonDisabled: { opacity: 0.45 },
    confirmButtonLabel: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.accent.ink,
      letterSpacing: letterSpacing.body,
    },
    savingFooterText: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
      textAlign: 'center',
    },
  });
}

export function makeMainGymPickerRowStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      padding: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
    },
    rowActive: { backgroundColor: theme.accent.soft },
    rowPressed: { opacity: 0.85 },
    rowMain: { flex: 1, gap: 2, minWidth: 0 },
    name: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.body,
    },
    address: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
  });
}

export function makeMainGymPickerEmptyStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[2],
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
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
