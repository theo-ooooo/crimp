import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * 루트 스택의 화면 파라미터 타입.
 *
 * 신규 화면은 반드시 여기 등록해야 타입 안전한 `navigation.navigate(...)` 호출 가능.
 *
 * 구조 (BottomTabs 도입 후):
 *  - 비인증: `Login` 만 노출 (`App.tsx` 가 `accessToken` 으로 분기)
 *  - 인증: `Home` 이 `MainTabs` 컨테이너 (BottomTabs) 로 매핑
 *  - 각 Tab 의 inner Stack 에 push 화면 (SessionList/SessionDetail/StartSession/GymSearch/GymDetail/Feed/Profile)
 *    이 등록되며, 모든 push 화면은 동일 RootStackParamList 키를 공유한다 (스코프는 Tab Stack 단위).
 *  - 따라서 `useNavigation<RootStackNavigationProp<'X'>>()` 시그니처는 변경 없이 유지 가능.
 */
export type RootStackParamList = {
  /**
   * 인증 후 진입 컨테이너 — BottomTabs 의 부모 스택 슬롯.
   * `MainTabsParamList` 를 그대로 위임받아 초기 탭 등을 지정할 수 있다.
   */
  Home: NavigatorScreenParams<MainTabsParamList> | undefined;
  /**
   * 로그인 화면. Kakao 네이티브 SDK + dev 토큰 폴백.
   *
   * 비인증 LoginStack 의 유일한 화면. 로그인 성공 시 `accessToken` 변경으로 App
   * 트리가 재렌더되어 자동으로 MainTabs 로 전환된다 (`navigation.reset` 호출은
   * Phase 1 호환을 위해 그대로 두지만, 인증 게이트가 우선한다).
   */
  Login: undefined;
  SessionList: undefined;
  /**
   * 세션 시작 화면. 선택적으로 특정 암장에서 바로 시작하도록 prefil 용 params 를 받는다.
   * (Gym 상세 화면의 "이 암장에서 세션 시작" CTA 에서 전달.)
   * StartSessionScreen 본체 수정은 별도 PR.
   */
  StartSession:
    | {
        gymExtId?: string;
        gymName?: string;
      }
    | undefined;
  SessionDetail: { extId: string };
  /**
   * 암장 검색·목록 (비인증 허용).
   */
  GymSearch: undefined;
  /**
   * 암장 지도 전체화면. 검색 화면의 현재 목록을 지도 마커로 표시한다.
   */
  GymMap: {
    gyms: Array<{
      extId: string;
      name: string;
      address: string | null;
      lat: number | null;
      lng: number | null;
      distanceMeters: number | null;
    }>;
  };
  /**
   * 암장 상세. 활성 루트 목록은 인증 필요 (화면 내부에서 gate 처리).
   */
  GymDetail: { extId: string };
  /**
   * 디자인 프리미티브 미리보기 (네비게이션 버튼 없이 딥링크/개발 모드 전용).
   */
  DesignPrimitives: undefined;
  /**
   * 피드 화면 (v2 디자인). 인증 필수 — 화면 내부에서 gate 처리.
   * BottomTabs `FeedTab` 의 루트 화면.
   */
  Feed: undefined;
  /**
   * 프로필 화면. 닉네임·레벨 표시(읽기 전용) + 내 암장 설정/변경/해제.
   * 인증 필수 — 화면 내부에서 gate 처리. BottomTabs `ProfileTab` 의 루트 화면.
   */
  Profile: undefined;
  /**
   * 프로필 수정 화면. nickname/bio/levelSelf 를 `PATCH /me/profile` 로 저장한다.
   */
  ProfileEdit: undefined;
};

export type RootStackNavigationProp<RouteName extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, RouteName>;

/**
 * BottomTabs 의 탭 키 정의.
 *
 * 각 탭은 자체 inner Stack 을 가지며, 그 Stack 의 화면들은 `RootStackParamList`
 * 의 키를 그대로 사용한다 (예: `SessionsTab` 의 inner Stack 은 `SessionList`,
 * `SessionDetail`, `StartSession` 화면을 가짐).
 */
export type MainTabsParamList = {
  HomeTab: undefined;
  FeedTab: undefined;
  SessionsTab: undefined;
  GymsTab: undefined;
  ProfileTab: undefined;
};

export type MainTabsNavigationProp<RouteName extends keyof MainTabsParamList> =
  BottomTabNavigationProp<MainTabsParamList, RouteName>;
