// [PR #112 리뷰 I1] crypto.getRandomValues 폴리필 — App 측 OAuth nonce 생성에 암호학적
// RNG 가 필요. 모든 import 보다 먼저 로드해 globalThis.crypto.getRandomValues 를 설치.
import 'react-native-get-random-values';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
