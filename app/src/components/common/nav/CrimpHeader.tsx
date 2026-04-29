import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

/**
 * native-stack 의 `headerLeft` 콜백 인자 형태. 라이브러리가 별도 export 하지
 * 않으므로 여기 로컬 타입으로 선언한다 (@react-navigation/native-stack types.tsx
 * 의 `HeaderBackButtonProps` 와 동일 형태).
 */
type HeaderBackButtonProps = {
  tintColor?: string;
  canGoBack: boolean;
  label?: string;
};

type HeaderButtonProps = {
  tintColor?: string;
  canGoBack: boolean;
};

import { CrimpIcon } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  space,
  touchTarget,
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
 *  - 좌측: `headerLeft` 옵션이 있으면 그걸로, 없고 `back` prop 존재 시 기본
 *    뒤로가기 chevron, 둘 다 아니면 빈 슬롯
 *  - 가운데/좌측: 화면 타이틀 — Crimp 디자인은 좌측 정렬이 기본 (mock 정합).
 *    참고로 `options.headerTitleAlign` 은 의도적으로 무시한다 (디자인 통일).
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

  const headerLeft = options.headerLeft as
    | ((props: HeaderBackButtonProps) => React.ReactNode)
    | undefined;
  const headerRight = options.headerRight as
    | ((props: HeaderButtonProps) => React.ReactNode)
    | undefined;

  // [reviewer B2] Android 비-translucent 상태바에서 insets.top 이 0 으로 잡힐
  // 수 있어 최소 fallback 과 max 합친다. 인라인 스타일이 styles.outer 의
  // paddingTop 을 덮어쓰는 회귀를 막는다.
  const topPadding = Math.max(insets.top, ANDROID_MIN_TOP_PAD);

  return (
    <View
      style={[
        styles.outer,
        { paddingTop: topPadding, backgroundColor: theme.bg },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.leftSlot}>
          {headerLeft
            ? headerLeft({
                tintColor: theme.text,
                canGoBack: Boolean(back),
              })
            : back
              ? (
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
                )
              : null}
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
            ? headerRight({
                tintColor: theme.text,
                canGoBack: Boolean(back),
              })
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
    // [reviewer I1] touchTarget.min(44) 에 맞춰 슬롯 폭 통일 — chevron tap 영역과
    // 우측 actions tap 영역 모두 44pt 권장 최소 사이즈.
    leftSlot: {
      width: touchTarget.min,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    titleSlot: {
      flex: 1,
      paddingHorizontal: space[2],
    },
    rightSlot: {
      minWidth: touchTarget.min,
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
      width: touchTarget.min,
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
