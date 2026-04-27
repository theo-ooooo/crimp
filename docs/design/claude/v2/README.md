# Claude Design v2 — 라임 + 신규 화면

v1 (Toss 블루 / 8개 화면) 에서 다음과 같이 변경:

## 1. Primary accent: Toss 블루 → 라임

```
v1: accent.base = #3182F6 (Toss 블루)
v2: accent.base = #C9F84B (climb-lime)
v2: accent.on   = #0F1419 (라임은 라이트 톤이라 위에 오는 텍스트는 다크)
```

`flash`, `soft`, `ink` 모두 갱신. 자세한 매핑은 `tokens.jsx` 와 갱신된 `docs/design/tokens.json` 참조.

## 2. 신규 화면 / 컴포넌트

`screens-ios-2.jsx`, `screens-ios-3.jsx` 에 추가:

- `LoginScreen` — 로그인 (이미 PR #48/#49 에서 구현, 디자인 정렬은 후속)
- `MySessionsScreen` — 내 세션 (기존 `SessionListScreen` 리디자인 대상)
- `GymSearchScreen` / `GymDetailScreen` — 기존 구현 + v2 라임 정렬
- `ProfileScreen` — 프로필 (현재 `web/app/me` 만 있고 app 미구현)
- **`FeedScreen`** — 피드 (Phase 1.5, 신규)
- **`LogAttemptSheet`** — 시도 기록 액션 시트 + 카메라 진입점 (신규)
- **`CameraSheet`** — 비디오/사진 녹화·촬영 모드 (신규)
- `VideoPreviewCard` — 미디어 프리뷰 카드

## 3. 로고 시스템

`Crimp Logo.html` — 라임 + 다크 차콜 + 모노스페이스 보조 폰트(JetBrains Mono) 조합 로고 라인업.
~~초안에는 타이틀이 "Climp" 로 표기되어 있던 오타가 있었지만~~ 2026-04-27 PR 에서 13곳 모두 "Crimp" 로 정정 완료.

## 4. 변경 도입 순서 (제안)

1. **라임 토큰 swap** (현재 PR) — accent.base/soft/ink/flash/on + globals.css/Tailwind/RN tokens
2. 새 화면 신규: LogAttemptSheet → CameraSheet → FeedScreen
3. 기존 화면 v2 정렬 (이미 라임이 자동 반영되긴 하지만 layout 변경 필요한 부분만)
4. 로고 적용 (Phase 1 막바지)

## 로컬 미리보기

```bash
cd docs/design/claude/v2
python3 -m http.server 8082
# http://localhost:8082/Crimp.html
```
