# @crimp/app

React Native 0.75 기반 모바일 앱 (iOS / Android).

## 최초 세팅

iOS는 Xcode, Android는 Android Studio + JDK 17 필요. 상세는 [RN 공식 셋업 가이드](https://reactnative.dev/docs/environment-setup) 참조.

```bash
pnpm install

# iOS (Mac)
cd ios && pod install && cd ..
pnpm ios

# Android
pnpm android
```

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `pnpm start` | Metro 번들러 |
| `pnpm ios` / `pnpm android` | 시뮬레이터·에뮬레이터 실행 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Jest |

## 구성

- React Native 0.75 + TypeScript strict
- React Navigation (Native Stack)
- TanStack Query (서버 상태)
- Zustand (UI 상태)
- i18next (ko / en)
- zod (런타임 검증)

iOS / Android 네이티브 폴더(`ios/`, `android/`)는 스캐폴드에 포함되지 않았습니다.
최초 실행 시 `npx @react-native-community/cli init` 으로 생성하거나 기존 템플릿을 머지하세요.
(PR별로 네이티브 설정을 별도 관리하기 위해 의도적으로 분리)

세부 규약은 [`../agents/frontend.md`](../agents/frontend.md).
