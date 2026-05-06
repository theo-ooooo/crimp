import type { NavigationProp, ParamListBase } from '@react-navigation/native';

import type { RootStackNavigationProp } from '@/navigation/types';

export function navigateHomeAfterSessionEnd(
  navigation: RootStackNavigationProp<'SessionDetail'>,
): void {
  navigation.popToTop();
  const parent = navigation.getParent<NavigationProp<ParamListBase>>();
  parent?.navigate('HomeTab', { screen: 'Home' });
}
