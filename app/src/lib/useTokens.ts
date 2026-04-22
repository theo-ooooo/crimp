import { useColorScheme } from 'react-native';
import { themeLight, themeDark, type Theme } from './tokens';

/**
 * 시스템 테마에 따라 라이트/다크 테마 토큰 번들을 반환.
 * 강제 테마(사용자 설정)가 추가되면 이 훅에 파라미터로 덧붙일 것.
 */
export function useTokens(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? themeDark : themeLight;
}
