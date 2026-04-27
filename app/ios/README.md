# Crimp iOS — 로컬 셋업

## 1. 의존성 설치

```bash
cd app
pnpm install
cd ios
pod install
```

## 2. 로컬 시크릿 (Kakao 앱 키)

`Info.plist` 의 `KAKAO_APP_KEY` 는 `$(KAKAO_APP_KEY)` 빌드 변수로 치환된다. 변수는 **xcconfig** 에서 공급한다.

```bash
cp app/ios/Crimp.xcconfig.sample app/ios/Crimp.xcconfig
```

`Crimp.xcconfig` 를 열어 카카오 네이티브 앱 키를 채운다. `Crimp.xcconfig` 는 `.gitignore` 로 커밋되지 않는다.

## 3. Xcode 프로젝트에 xcconfig 연결 (1회)

Xcode 가 xcconfig 를 자동 인식하지 않으므로 첫 셋업 시 수동 지정이 필요하다.

1. `app/ios/Crimp.xcworkspace` 를 Xcode 로 연다.
2. 좌측 트리에서 **`Crimp`** 프로젝트 (root) 선택.
3. 가운데 패널에서 **`Info`** 탭 → **`Configurations`** 섹션.
4. `Debug` 와 `Release` 두 행 모두 **`Crimp`** 라는 자식 항목에서 드롭다운을 열고 **`Crimp.xcconfig`** 를 고른다.
   - 처음이라면 "Drag in a configuration file" 메시지가 보일 수 있다 → Project Navigator 좌측 트리에 `Crimp.xcconfig` 를 드래그해 추가 (target membership 은 비워둔다).
5. Configuration 양쪽 모두 `Crimp.xcconfig` 가 선택됐는지 확인 후 종료.

빌드 시 `KAKAO_APP_KEY` 가 Info.plist 의 placeholder 로 치환된다.

## 4. 시뮬레이터 / 실 디바이스 빌드

```bash
# Metro 띄우기 (별도 터미널)
pnpm --filter @crimp/app start

# 시뮬레이터로 빌드·런
pnpm --filter @crimp/app ios

# 실 디바이스 빌드: Xcode 에서 디바이스 선택 후 ▶ — 또는
pnpm --filter @crimp/app ios --device "<device name>"
```

## 5. 백엔드 연결

기본 `EXPO_PUBLIC_API_URL=http://localhost:8080` (시뮬레이터에서 동작).

- **실 디바이스**: `app/.env` 에 머신 LAN IP 사용 (예: `EXPO_PUBLIC_API_URL=http://192.168.0.10:8080`).
- **Android 에뮬레이터**: 호스트 머신은 `10.0.2.2` 로 접근 (별도 환경에서 빌드).

> NOTE: `process.env.EXPO_PUBLIC_API_URL` 을 빌드 시점에 인라인하려면 Metro 에 env 플러그인이 필요하다 (현재 미설정). 우선은 `app/src/lib/api/config.ts` 의 fallback (`http://localhost:8080`) 으로 시뮬레이터 검증 후, 실 디바이스 단계에서 별도 PR 로 env 주입 도입 예정.
