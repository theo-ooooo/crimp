import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackHeaderProps,
} from '@react-navigation/native-stack';

import { CrimpHeader } from '@/components/nav/CrimpHeader';
import { CrimpIcon, type IconName } from '@/components/primitives/Icon';
import { t } from '@/lib/i18n';
import { fontFamily, fontSize, fontWeight, type Theme } from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';
import FeedScreen from '@/screens/FeedScreen';
import GymDetailScreen from '@/screens/GymDetailScreen';
import GymSearchScreen from '@/screens/GymSearchScreen';
import HomeScreen from '@/screens/HomeScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SessionDetailScreen from '@/screens/SessionDetailScreen';
import SessionListScreen from '@/screens/SessionListScreen';
import StartSessionScreen from '@/screens/StartSessionScreen';

import type { MainTabsParamList, RootStackParamList } from './types';

/**
 * BottomTabs 루트 — 인증 후 진입 컨테이너.
 *
 * 5탭 구성: 홈 / 피드 / 세션 / 암장 / 프로필.
 * 각 탭은 자체 NativeStack 을 가지며, 그 안에 push 대상 detail 화면을 등록한다.
 * (Detail 진입 시 BottomTabs 가 보이는 동작은 Phase 1 의도; hidden 옵션은 후속.)
 */

const Tab = createBottomTabNavigator<MainTabsParamList>();

// 각 탭의 inner Stack 은 동일 `RootStackParamList` 를 ParamList 로 공유한다.
// 이렇게 두면 화면 본문의 `useNavigation<RootStackNavigationProp<'X'>>()` 시그니처가
// 변경 없이 동작한다 — 라우트 이름만 일치하면 React Navigation 이 알아서 해당 inner
// Stack 에 push 한다.
const HomeStack = createNativeStackNavigator<RootStackParamList>();
const FeedStack = createNativeStackNavigator<RootStackParamList>();
const SessionsStack = createNativeStackNavigator<RootStackParamList>();
const GymsStack = createNativeStackNavigator<RootStackParamList>();
const ProfileStack = createNativeStackNavigator<RootStackParamList>();

// 모든 inner Stack 의 헤더를 Crimp 공용 컴포넌트로 통일.
//   - iOS native-stack 의 센터 정렬·기본 폰트와 Android 의 좌측 정렬·기본 폰트가
//     시각적으로 어긋나던 부분 해소.
//   - 옵션은 inner Stack 별로 동일해 screenOptions 로 한 번만 지정.
const stackScreenOptions = {
  header: (props: NativeStackHeaderProps) => <CrimpHeader {...props} />,
} as const;

function HomeTabStack(): JSX.Element {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('common.brand') }}
      />
      <HomeStack.Screen
        name="StartSession"
        component={StartSessionScreen}
        options={{ title: t('session.start.title') }}
      />
      <HomeStack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: t('session.detail.title') }}
      />
    </HomeStack.Navigator>
  );
}

function FeedTabStack(): JSX.Element {
  return (
    <FeedStack.Navigator screenOptions={stackScreenOptions}>
      <FeedStack.Screen
        name="Feed"
        component={FeedScreen}
        options={{ title: t('feed.title') }}
      />
    </FeedStack.Navigator>
  );
}

function SessionsTabStack(): JSX.Element {
  return (
    <SessionsStack.Navigator screenOptions={stackScreenOptions}>
      <SessionsStack.Screen
        name="SessionList"
        component={SessionListScreen}
        options={{ title: t('session.list.title') }}
      />
      <SessionsStack.Screen
        name="StartSession"
        component={StartSessionScreen}
        options={{ title: t('session.start.title') }}
      />
      <SessionsStack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: t('session.detail.title') }}
      />
    </SessionsStack.Navigator>
  );
}

function GymsTabStack(): JSX.Element {
  return (
    <GymsStack.Navigator screenOptions={stackScreenOptions}>
      <GymsStack.Screen
        name="GymSearch"
        component={GymSearchScreen}
        options={{ title: t('gym.list.title') }}
      />
      <GymsStack.Screen
        name="GymDetail"
        component={GymDetailScreen}
        options={{ title: t('gym.detail.title') }}
      />
      <GymsStack.Screen
        name="StartSession"
        component={StartSessionScreen}
        options={{ title: t('session.start.title') }}
      />
    </GymsStack.Navigator>
  );
}

function ProfileTabStack(): JSX.Element {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('profile.title') }}
      />
    </ProfileStack.Navigator>
  );
}

type TabKey = keyof MainTabsParamList;

type TabSpec = {
  key: TabKey;
  component: () => JSX.Element;
  icon: IconName;
  labelKey: 'nav.home' | 'nav.feed' | 'nav.sessions' | 'nav.gyms' | 'nav.profile';
  accessibilityLabelKey: 'nav.a11y.home' | 'nav.a11y.feed' | 'nav.a11y.sessions' | 'nav.a11y.gyms' | 'nav.a11y.profile';
};

// 탭 순서: 홈 / 피드 / 세션 / 암장 / 프로필 (스펙 고정).
const tabs: readonly TabSpec[] = [
  {
    key: 'HomeTab',
    component: HomeTabStack,
    icon: 'home',
    labelKey: 'nav.home',
    accessibilityLabelKey: 'nav.a11y.home',
  },
  {
    key: 'FeedTab',
    component: FeedTabStack,
    icon: 'feed',
    labelKey: 'nav.feed',
    accessibilityLabelKey: 'nav.a11y.feed',
  },
  {
    key: 'SessionsTab',
    component: SessionsTabStack,
    icon: 'clock',
    labelKey: 'nav.sessions',
    accessibilityLabelKey: 'nav.a11y.sessions',
  },
  {
    key: 'GymsTab',
    component: GymsTabStack,
    icon: 'pin',
    labelKey: 'nav.gyms',
    accessibilityLabelKey: 'nav.a11y.gyms',
  },
  {
    key: 'ProfileTab',
    component: ProfileTabStack,
    icon: 'profile',
    labelKey: 'nav.profile',
    accessibilityLabelKey: 'nav.a11y.profile',
  },
] as const;

/**
 * BottomTab 의 기본 ripple/highlight 를 끈 단순 Pressable 버튼.
 *
 * `useReducedMotion` 가 켜진 경우 압력 시 opacity 변화도 생략해 정적 상태를 유지한다.
 */
function TabBarButton(props: BottomTabBarButtonProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const {
    children,
    onPress,
    onLongPress,
    accessibilityRole,
    accessibilityState,
    accessibilityLabel,
    testID,
    style,
  } = props;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      android_ripple={null}
      style={({ pressed }) => [
        style,
        styles.tabButton,
        pressed && !reducedMotion ? styles.tabButtonPressed : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

function renderTabBarButton(
  buttonProps: BottomTabBarButtonProps,
): React.ReactNode {
  return <TabBarButton {...buttonProps} />;
}

type TabBarLabelProps = {
  focused: boolean;
  color: string;
  labelKey: TabSpec['labelKey'];
};

function TabBarLabel({ focused, color, labelKey }: TabBarLabelProps): JSX.Element {
  const theme = useTokens();
  const tabBarStyles = useMemo(() => makeTabBarStyles(theme), [theme]);
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={1}
      style={[
        tabBarStyles.labelText,
        {
          color,
          fontWeight: focused ? fontWeight.bold : fontWeight.medium,
        },
      ]}
    >
      {t(labelKey)}
    </Text>
  );
}

type TabBarIconProps = {
  icon: IconName;
  color: string;
  size: number;
};

function TabBarIcon({ icon, color, size }: TabBarIconProps): JSX.Element {
  const Icon = CrimpIcon[icon];
  return <Icon size={size} color={color} />;
}

function makeTabOptions(tab: TabSpec) {
  return {
    tabBarAccessibilityLabel: t(tab.accessibilityLabelKey),
    tabBarLabel: ({ focused, color }: { focused: boolean; color: string }) => (
      <TabBarLabel focused={focused} color={color} labelKey={tab.labelKey} />
    ),
    tabBarIcon: ({ color, size }: { color: string; size: number }) => (
      <TabBarIcon icon={tab.icon} color={color} size={size ?? 24} />
    ),
  } as const;
}

export default function MainTabs(): JSX.Element {
  const theme = useTokens();
  const tabBarStyles = useMemo(() => makeTabBarStyles(theme), [theme]);

  return (
    <Tab.Navigator
      screenOptions={{
        // 각 탭의 inner Stack 헤더가 별도로 그려지므로 Tab 헤더는 숨긴다.
        headerShown: false,
        tabBarActiveTintColor: theme.accent.ink,
        tabBarInactiveTintColor: theme.text3,
        tabBarStyle: tabBarStyles.bar,
        tabBarItemStyle: tabBarStyles.item,
        tabBarButton: renderTabBarButton,
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.key}
          name={tab.key}
          component={tab.component}
          options={makeTabOptions(tab)}
        />
      ))}
    </Tab.Navigator>
  );
}

function makeTabBarStyles(theme: Theme) {
  return StyleSheet.create({
    bar: {
      backgroundColor: theme.bg,
      borderTopColor: theme.hairline,
      borderTopWidth: StyleSheet.hairlineWidth,
      // iOS 의 안전 영역은 BottomTabs 가 자체 처리. 높이는 라벨+아이콘이 모두 보이도록.
      ...Platform.select({
        ios: { height: 84 },
        default: { height: 64 },
      }),
    },
    labelText: {
      fontFamily,
      fontSize: fontSize.caption,
      letterSpacing: 0,
    },
    item: {
      paddingTop: 6,
      paddingBottom: Platform.select({ ios: 0, default: 6 }),
    },
  });
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
});
