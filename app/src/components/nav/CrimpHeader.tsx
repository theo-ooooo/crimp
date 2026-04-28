import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

import { CrimpIcon } from '@/components/primitives';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

/**
 * Crimp 공용 상단 헤더.
 *
 * React Navigation 의 native-stack 기본 헤더는 iOS(센터 정렬·serif 비례)와
 * Android(좌측·sans-serif·다른 폰트 굵기)가 시각적으로 어긋난다. 본 컴포넌트는
 * 양 플랫폼에서 동일하게 보이도록:
 *  - 콘텐츠 높이 44pt 고정 + 상단 safe-area 인셋 자동 반영
 *  - 좌측: 뒤로가기 chevron (스택에 push 된 화면에서만, `back` prop 존재 시)
 *  - 가운데/좌측: 화면 타이틀 — Crimp 디자인은 좌측 정렬이 기본 (mock 정합)
 *  - 우측: `headerRight` 옵션이 있으면 함수 호출해 렌더, 없으면 빈 슬롯
 *  - 하단: 1px hairline (테마의 hairline 색)
 *
 * `MainTabs` 의 각 inner Stack 의 `screenOptions.header` 로 주입한다.
 */
export function CrimpHeader(props: NativeStackHeaderProps): JSX.Element {
  const { back, options, navigation, route } = props;
  const theme = useTokens();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // options.title 우선, 없으면 route.name (참고: 기존 MainTabs.tsx 가 모든 screen 에 title 지정).
  const title = typeof options.title === 'string' ? options.title : route.name;

  const headerRight = options.headerRight as
    | ((props: { canGoBack: boolean }) => React.ReactNode)
    | undefined;

  return (
    <View
      style={[
        styles.outer,
        { paddingTop: insets.top, backgroundColor: theme.bg },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.leftSlot}>
          {back ? (
            <Pressable
              onPress={navigation.goBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              style={({ pressed }) => [
                styles.iconButton,
                pressed ? styles.iconButtonPressed : null,
              ]}
            >
              <CrimpIcon.chevL size={24} color={theme.text} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.titleSlot}>
          <Text
            style={styles.title}
            numberOfLines={1}
            ellipsizeMode="tail"
            accessibilityRole="header"
          >
            {title}
          </Text>
        </View>

        <View style={styles.rightSlot}>
          {headerRight
            ? headerRight({ canGoBack: Boolean(back) })
            : null}
        </View>
      </View>
      <View style={[styles.hairline, { backgroundColor: theme.hairline }]} />
    </View>
  );
}

const HEADER_CONTENT_HEIGHT = 44;
// Android 의 statusBar 가 transparent 가 아닐 때 safe-area top 이 0 으로 잡힐
// 수 있어 최소 패딩으로 가독성 확보.
const ANDROID_MIN_TOP_PAD = Platform.OS === 'android' ? 8 : 0;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    outer: {
      paddingTop: ANDROID_MIN_TOP_PAD,
    },
    row: {
      height: HEADER_CONTENT_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space[2],
    },
    leftSlot: {
      width: 40,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    titleSlot: {
      flex: 1,
      paddingHorizontal: space[2],
    },
    rightSlot: {
      minWidth: 40,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    title: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.title,
      color: theme.text,
    },
    iconButton: {
      width: 40,
      height: HEADER_CONTENT_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonPressed: {
      opacity: 0.6,
    },
    hairline: {
      height: StyleSheet.hairlineWidth,
      width: '100%',
    },
  });
}
