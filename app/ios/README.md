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

### 3-1. (선택) 빌드 시점 검증 스크립트

xcconfig 셋업을 빠뜨리거나 키가 비어있을 때 빌드 단계에서 명시적 에러로 실패하도록 Run Script 를 추가한다.

1. Xcode → 타겟 `Crimp` → **Build Phases** 탭.
2. 좌상단 `+` → **`New Run Script Phase`** 추가, **`Compile Sources`** 보다 위로 드래그.
3. Shell: `/bin/bash`, 본문에 다음:
   ```bash
   "${SRCROOT}/scripts/validate-kakao-key.sh"
   ```

빈 값 / placeholder / `$(KAKAO_APP_KEY)` 리터럴이 그대로 들어오면 빌드 실패 + 안내 메시지.

## 4. 시뮬레이터 / 실 디바이스 빌드

```bash
# Metro 띄우기 (별도 터미널)
cd app && pnpm start

# 시뮬레이터로 빌드·런
cd app && pnpm ios

# 실 디바이스 빌드: Xcode 에서 디바이스 선택 후 ▶ — 또는
cd app && pnpm ios --device "<device name>"
```

## 5. 백엔드 연결

`src/lib/api/config.ts` 가 platform 기반 default 를 사용:
- **iOS 시뮬레이터**: `http://localhost:8080`
- **Android 에뮬레이터**: `http://10.0.2.2:8080` (호스트 Mac 의 localhost)
- env 변수 `CRIMP_API_URL` 이 우선 (단, 아래 NOTE 참고)

**실 디바이스(USB/Wi-Fi)**: 머신 LAN IP 가 필요. 현재 env 주입이 미설정이라 일시적으로 `config.ts` 의 default 를 직접 수정해 사용. 후속 PR 에서 babel-plugin-transform-inline-environment-variables 또는 react-native-config 도입 예정.

> NOTE: bare RN 의 기본 빌드 파이프라인은 `process.env.X` 를 주입하지 않아 `CRIMP_API_URL` env 는 위 플러그인 도입 전까지 효과가 없다. 그 전까지는 platform default 또는 `config.ts` 직접 수정으로 운영.
