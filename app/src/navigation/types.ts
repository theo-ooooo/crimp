import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * 루트 스택의 화면 파라미터 타입.
 *
 * 신규 화면은 반드시 여기 등록해야 타입 안전한 `navigation.navigate(...)` 호출 가능.
 */
export type RootStackParamList = {
  Home: undefined;
  /**
   * 로그인 화면. Kakao 네이티브 SDK + dev 토큰 폴백.
   *
   * HomeScreen 의 LoggedOutView CTA 에서 진입한다. 로그인 성공 시 `Home` 으로 reset.
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
   * 암장 상세. 활성 루트 목록은 인증 필요 (화면 내부에서 gate 처리).
   */
  GymDetail: { extId: string };
  /**
   * 디자인 프리미티브 미리보기 (네비게이션 버튼 없이 딥링크/개발 모드 전용).
   */
  DesignPrimitives: undefined;
  /**
   * 피드 화면 (v2 디자인). 인증 필수 — 화면 내부에서 gate 처리.
   * 임시로 HomeScreen 의 진입 카드에서 navigate. BottomTabs 도입은 별개 PR.
   */
  Feed: undefined;
  /**
   * 프로필 화면. 닉네임·레벨 표시(읽기 전용) + 내 암장 설정/변경/해제.
   * 인증 필수 — 화면 내부에서 gate 처리. HomeScreen 의 카드에서 진입한다.
   */
  Profile: undefined;
};

export type RootStackNavigationProp<RouteName extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, RouteName>;
