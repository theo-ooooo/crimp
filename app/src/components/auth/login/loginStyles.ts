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

export function makeLoginStyles(theme: Theme) {
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
      paddingHorizontal: space[6],
      paddingTop: space[20],
      paddingBottom: space[6],
      gap: space[6],
    },
    heroBlock: {
      gap: space[3],
    },
    brandLogoWrap: {
      marginBottom: space[2],
    },
    brand: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h1,
      color: theme.text,
      marginBottom: space[2],
    },
    headline: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h1,
      color: theme.text,
      lineHeight: fontSize.h1 * 1.2,
    },
    subDescription: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      lineHeight: fontSize.body * 1.5,
    },
    alreadyLoggedIn: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text2,
      textAlign: 'center',
    },
    heroButton: {
      alignSelf: 'stretch',
      marginTop: space[4],
    },
    bottomCta: {
      paddingHorizontal: space[6],
      paddingTop: space[3],
      paddingBottom: space[3],
      gap: space[3],
    },
    termsNotice: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
      textAlign: 'center',
      lineHeight: fontSize.caption * 1.5,
    },
    noticeCard: {
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    noticeTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    noticeBody: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text2,
    },
    errorCard: {
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
      fontSize: fontSize.caption,
      color: theme.text2,
    },
    devSection: {
      gap: space[3],
    },
    devToggle: {
      paddingVertical: space[3],
      alignSelf: 'flex-start',
    },
    devTogglePressed: {
      opacity: 0.7,
    },
    devToggleLabel: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    devPanel: {
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[2],
    },
    devHint: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
    },
    devLabel: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
      marginTop: space[2],
    },
    devInput: {
      backgroundColor: theme.bg,
      borderColor: theme.hairline,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: space[3],
      minHeight: 96,
      color: theme.text,
      fontFamily,
      fontSize: fontSize.caption,
      textAlignVertical: 'top',
    },
    devSubmit: {
      marginTop: space[2],
    },
  });
}

export type LoginStyles = ReturnType<typeof makeLoginStyles>;
