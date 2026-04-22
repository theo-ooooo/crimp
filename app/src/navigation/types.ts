import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * 루트 스택의 화면 파라미터 타입.
 *
 * 신규 화면은 반드시 여기 등록해야 타입 안전한 `navigation.navigate(...)` 호출 가능.
 */
export type RootStackParamList = {
  Home: undefined;
  SessionList: undefined;
  StartSession: undefined;
  SessionDetail: { extId: string };
  /**
   * 디자인 프리미티브 미리보기 (네비게이션 버튼 없이 딥링크/개발 모드 전용).
   */
  DesignPrimitives: undefined;
};

export type RootStackNavigationProp<RouteName extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, RouteName>;
