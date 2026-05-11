# 핸드오프 노트 — 2026-05-02 (피드 미디어 4단계 완료, 비디오 재생까지)

이전 노트 `handoff-2026-05-02.md` 의 갱신본. F1~F4 모두 머지/오픈 상태로 정리되어
다음 작업자/코덱스가 그대로 이어받을 수 있도록 한다.

---

## 1. 한 눈에 (지난 며칠)

| 일자 | 작업 |
| --- | --- |
| 04-30 | PR #112 (OAuth nonce 검증), #113 (스플래쉬 + 앱 아이콘) |
| 05-01 | PR #114 (Fly.io staging 인프라), #115 (rn-config + 카메라 폴리시) |
| 05-02 | PR #116 (업로드 압축), #117 (R2 CDN 런북), #118 (프로필 편집 UI — 사용자 직접), #119 (피드 mediaUrls), #120 (피드 카드 미디어 + 비디오 재생 + cdn_url DROP 리팩토링 + 리뷰 6건 반영, 머지 대기) |

PRD §12 (2026-04-28 기준) 의 폴리시 항목 + Phase 1.5 인프라가 거의 닫혔고, 남은 큰
빈 칸은 **#6 크루 개설/가입 기초**.

## 2. 머지 상태

### 머지 끝
- **PR #112** OAuth nonce 검증 — Apple SHA-256 / Kakao 평문, AuthService.exchange/exchangeCode 의 expectedNonce 오버로드.
- **PR #113** 스플래쉬 + 앱 아이콘 — react-native-bootsplash + ink bg + lime boulder. 자산 파이프라인 (`app/assets/branding/`) 의 SVG/PNG 재생성 가능.
- **PR #114** API staging 배포 인프라 — Fly.io NRT, MySQL self-host (1GB volume), Upstash Redis, R2 (S3-compatible), `application-staging.yml`, `Dockerfile`, `fly.toml`, `infra/fly/mysql/`, `staging-deploy.yml`, runbook.
- **PR #115** react-native-config + 실기기 폴리시 — `.env` 빌드타임 주입, iOS modal nesting fix (onDismiss 기반 시리얼라이즈), 다크모드 active 탭 가시성, 카메라 줌 0.5x/1x/2x/3x (multi-cam virtual + neutralZoom 좌표 변환), 비디오 10분 자동 컷오프, flip 카메라, 업로드 spinner 인라인, Redis 헬스 분리, fly.toml always-on + cpu-2x.
- **PR #116** 업로드 미디어 압축 — `@bam.tech/react-native-image-resizer` (이미지 1920px JPEG q80) + `react-native-compressor` (비디오 ~720p / 2 Mbps). 압축/업로드 phase 분리 spinner. `signal.aborted` pre-check.
- **PR #117** R2 CDN 런북 보강 — Path A (R2 public r2.dev subdomain) / Path B (Custom Domain). 보안 트레이드오프 + cert 발급 지연 + edge 캐시 + CDN GET 트러블슈팅 행 추가.
- **PR #118** 프로필 편집 UI — 사용자가 직접 작성한 PR. (내가 작업한 게 아니므로 세부 미상.)
- **PR #119** 피드 아이템에 `mediaUrls` 노출 — `FeedMediaItem` 도메인 record + `FeedMediaRow` projection + repo `findFeedMediaForPosts(postIds)` (post_media JOIN media_assets, status=READY filter, ORDER BY post_id, seq). FeedService 에서 batch fetch + LinkedHashMap 그룹핑 + null cdnUrl 항목 제외. web/app zod 스키마 required `mediaUrls`. FeedServiceTest +4 케이스.

### 오픈 (이 핸드오프 시점 기준)
- **PR #120** — 피드 카드 이미지/비디오 렌더링 + cdn_url 컬럼 폐기 + 리뷰 반영 (F3 묶음, 4커밋)
  - `3436468` web `<img loading="lazy">` + `<video controls poster preload="metadata" playsInline>`, app `<Image>` + ▶ 오버레이.
  - `975850c` 비디오 재생 추가. `react-native-video ^6.19.2`, FeedMediaTile Pressable, 비디오 탭 → 풀스크린 RN Modal + autoplay + ✕ 닫기.
  - `736cd12` **cdn_url / thumbnail_cdn_url 컬럼 DROP** (Flyway V202605021000). 응답 시점에 `app.media.cdn-base-url + s3_key` 합성. CDN 도메인 변경 시 backfill 불필요. `MediaAsset.markReady(variantsJson)` 시그니처 단순화. 기존에 `cdn_url=NULL` 행이 `groupMedia` null 가드에 걸려 mediaUrls 가 빈 배열로 떨어지던 회귀도 동시 해결.
  - `44d620f` 리뷰 개선 6건 반영:
    - I1 앱 모달 동시 표시 가드 — 모듈 스코프 `videoModalLock`
    - I2 웹 이미지 alt — note 80자 클립 → 작성자/인덱스 fallback
    - I3 앱 image 타일 → `<View>` 폴백 (안드로이드 ripple 오인 차단)
    - I4 `FeedService` cdn-base 미설정 시 첫 호출 1회 `log.warn` (AtomicBoolean 가드)
    - I5 앱 비디오 placeholder — `theme.subtle` 배경 + ▶ (Image 가 mp4 디코드 못해 회색 박스 되던 것)
    - I6 웹 비디오 placeholder — `bg-neutral-200 dark:bg-neutral-800` + ▶ 오버레이
  - **리뷰 결과**: 블로커 0건 / 개선 제안 적용 6건 / 후속 별도 PR 5건 (단일 모달 매니저, thumbnail_s3_key 도입, Zero-downtime 3단계 흐름 등). PR 코멘트가 정본.
  - 검증: `./gradlew check`, `pnpm typecheck` (web+app), `pnpm jest` (83 PASS) 그린.
  - **상태**: 머지 대기 (사용자 액션). 머지 후 `cd app/ios && pod install` + Metro reset + 재빌드 필요.

## 3. 다음 작업 (코덱스 / 다음 진행자)

### 우선 (이번 PR #120 마무리)
1. **사용자 머지** — PR #120 머지 후 staging-deploy.yml 자동 트리거 → Flyway V202605021000 가 staging DB 의 `cdn_url`/`thumbnail_cdn_url` 컬럼 DROP. 새 인스턴스가 합성된 cdnUrl 응답 내려보냄.
2. 사용자 측 `cd app/ios && pod install` (RNVideo native) + Metro reset + 재빌드.

### 중기 (PRD §12 기준)
1. **#6 크루 개설/가입 기초** — Phase 1.5 우선순위. PRD/유저스토리 레벨 설계부터. 큰 작업이라 `/설계시작` 필요할 수 있음.

### 후속 (작은 폴리시)
- **단일 모달 매니저** — 현재 PR #120 의 `videoModalLock` 모듈 락은 임시 가드. Context/글로벌 상태 기반의 진짜 단일 모달 매니저로 승격 (리뷰 후속 F5).
- **`thumbnail_s3_key` + `variants` JSON 도입** — Phase 1.5 트랜스코드 진입 시 비디오 썸네일을 실제로 그릴 수 있도록. 도입 후 web/app 의 placeholder ▶ 분기 제거.
- **DB Zero-downtime 3단계 흐름 도입** — 다음 동일 패턴 변경 시 ① 코드에서 컬럼 사용 중단 배포 → ② 마이그레이션 DROP → ③ 후속 정리. PR #120 의 V202605021000 은 단일 머지 (회귀 수정 성격) 로 진행.
- **`MediaUrlComposer` 합성 유틸 통합** — 현재 `FeedService.groupMedia` 와 `MediaService.buildCdnUrl` 두 곳에 cdn-base + s3Key 결합 로직 중복. 단, 두 곳의 정책 (FeedService 는 base 비면 미디어 통째 제외 / MediaService 는 cdnUrl=null 만 반환) 이 미묘히 다르므로 그 차이를 보존하는 형태로.
- 이미지 lightbox (탭 → 확대) — F3 후속.
- 비디오 다중 미디어 carousel indicator (현재 인덱스/총 개수).
- 카메라 0.5×/1×/2×/3× 의 active chip 비교 부동소수 조정 (필요 시).
- iOS 18 tinted icon / Android 12+ themed (monochrome) launcher icon — Phase 2.
- bootsplash 다크 모드 자산 (paid license 검토).
- 1920px 이미지 → 피드 그리드 thumbnail 변환 (Cloudflare Image Resizing 또는 서버측).
- prod CDN 정책 (CloudFront 분기 또는 R2 Custom Domain 그대로).
- 토큰/MySQL pw/R2 토큰 정기 회전 정책 (90일).
- Fly volume 백업/복구 절차.
- Dockerfile layered cache 최적화.
- CI 그린 게이팅 (`workflow_run` 이미 적용 — F4 follow-up F4 항목).
- Apple `exchangeCode` E2E 테스트 (`AuthServiceTest` 매트릭스 보강).
- App nonce RNG 암호학적 RNG (실제 적용은 PR #112 에서 했음, 후속은 함수명 일반화 — 이미 적용됨).

## 4. 환경 / 인프라 상태

### Staging (Fly.io)
- **API**: `crimp-api-staging.fly.dev` (NRT, shared-cpu-2x / 1GB, always-on `min_machines_running=1`). `staging-api.crimp.run` 도메인 전입 진행 중 (Cloudflare DNS 위임 완료 후 `flyctl certs check` 로 확인).
- **MySQL**: `crimp-mysql-staging.internal:3306` 6PN, 1GB volume, mysql:8.0 self-host (`useSSL=false&allowPublicKeyRetrieval=true`). 운영(prod) 진입 시 RDS/PlanetScale 권장.
- **Redis**: Upstash AP-Northeast-1 (Tokyo) free tier, TLS, Spring `management.health.redis.enabled=false` (응답 지연 → Fly 헬스체크 grace 초과 회귀 차단).
- **R2**: bucket `crimp-media-staging`, endpoint `https://1cc9031d5b3bd949d6bad8f935d5d378.r2.cloudflarestorage.com`. CDN 활성화 — 사용자가 R2 public + r2.dev subdomain (Path A) 또는 Custom Domain `staging-media.crimp.run` (Path B) 중 선택. 시크릿 `CDN_BASE_URL`.
- **CI 흐름**: `develop` push → `ci.yml` (gradle check) → 그린 시 `staging-deploy.yml` workflow_run → flyctl deploy. `FLY_API_TOKEN` GitHub Secret 등록됨.

### App (iOS / Android)
- RN 0.75.4. Java 21 빌드 (Apple Silicon 호환 위해 ms-21.0.6 사용 — 시스템 Java 25 와 Gradle 8.13 비호환 회피).
- Native 모듈: vision-camera 4, bootsplash 6.3, react-native-config 1.6, get-random-values 1.x, image-resizer 3.0, compressor 1.18, video 6.19.
- iOS minimum: 14? (확인 필요). Pod install 마다 추가됨.
- 빌드 시 `pnpm start --reset-cache` 후 `pnpm run ios` / `pnpm run android` 패턴.

### Web (Next.js)
- pnpm typecheck / build OK. `react-native-config` 형 빌드타임 주입은 web 에선 Next.js 의 `process.env.NEXT_PUBLIC_*` 패턴 (`web/.env*`) 사용.

## 5. 사용자 측 미해결 To-Do

- 🌐 도메인 `crimp.run` 의 Cloudflare DNS 전입 완료 확인 (`dig NS crimp.run`).
- 🔒 Cloudflare R2 의 `CDN_BASE_URL` 시크릿 주입 (Path A 또는 B 결정 후) — Path A 가 빠름.
- 🔑 (이전 세션 잔여) 디스코드에 노출된 Kakao REST API 키 로테이션 — 아직이라면 우선순위 ↑.
- 🎬 PR #120 머지 → staging-deploy.yml 로 자동 배포 (Flyway V202605021000 가 staging DB 의 cdn_url/thumbnail_cdn_url 컬럼 DROP).
- 🎥 PR #120 머지 후 `cd app/ios && pod install` (RNVideo native) + Metro reset + 재빌드.
- 📊 staging 동작 회귀 테스트 — F1~F4 + 비디오 재생까지의 end-to-end (캡처 → 압축 → 업로드 → 피드 표시 → 비디오 재생).

## 6. 컨벤션 / 패턴 메모

### Git 흐름
- Branch: `feature/{기능}` / `fix/{버그}` / `improve/{기능}` / `docs/{영역}` / `refactor/{...}`.
- Commit: `feat/fix/refactor/style/test/docs/chore/db: 한국어 설명 (PR #N 또는 후속)`.
- Co-Authored-By: `Claude Opus 4.7 (1M context) <noreply@anthropic.com>` 매 커밋.
- 머지: PR 단위, Squash 권장.
- direct push to develop 가능 (브랜치 보호 warning-only) 이지만 일반적으로 PR 흐름.

### 리뷰 사이클
- PR 오픈 직후 `/리뷰시작 N` 으로 reviewer 에이전트 호출.
- 결과 → 블로커/제안 항목별 고지 후 사용자 승인 → 적용 → fix-applied 코멘트 게시 (`feedback_pr_review_response.md` 메모리).
- 외부 reviewer (예: Codex) 코멘트도 동일 흐름.

### Java / Spring
- `@ConfigurationProperties` 사용, `@Value` 금지 (auto-memory).
- Lombok `@Data` 금지.
- Flyway 마이그레이션 = `crimp-core/src/main/resources/db/migration/V{YYYYMMDDHHmm}__name.sql`.
- `@Profile("!test")` 패턴으로 테스트 컨텍스트와 격리.

### TS / RN
- zod 의 `.default([])` / `.optional()` / `.catch` / `.preprocess` 모두 z.infer 출력 타입 부작용 → required 가 가장 깨끗 + 배포 순서로 호환 보장.
- jest.mocks/ 패턴 — native 모듈 stub 으로 transformIgnorePatterns 회피.
- `babel-plugin-module-resolver` 로 `@/*` 별칭 사용.
- iOS modal 시리얼라이즈는 RN `<Modal>` 의 `onDismiss` 콜백 (iOS only) + ref 기반 pending intent 패턴 (`useSessionDetailScreen.openCamera/closeCamera/handleCaptured`).

### 카메라
- multi-cam virtual device: `useCameraDevice('back', { physicalDevices: [...] })` 명시 필요.
- vision-camera zoom 좌표계는 ultrawide=1.0 / wide=neutralZoom (~2.0) — user-friendly 라벨은 user×neutralZoom 변환 + min/max 클램프.

## 7. 알려진 이슈 / 임시 우회

- (none currently — known unstable patterns 모두 해결되었거나 상기 follow-up 으로 분리됨)

## 8. 참고 문서

- `CLAUDE.md` — 전역 안내서.
- `agents/{backend,frontend,design,docs,qa,reviewer}.md` — 에이전트 하네스.
- `docs/기획/{prd,user-story,persona,maingym-onboarding}.md` — 기획.
- `docs/운영/staging-deploy.md` — staging 셋업 런북 (Fly + R2 + Upstash).
- `docs/운영/handoff-2026-05-02.md` — F1 진행 시점의 이전 핸드오프 (보존).
- `docs/운영/handoff-2026-05-02-end.md` (본 문서) — F1~F4 + 비디오 재생 + cdn_url 컬럼 폐기 리팩토링 + 리뷰 6건 반영까지 정리.
