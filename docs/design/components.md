# 컴포넌트 스펙

웹(Next.js)과 앱(React Native)에서 공유하는 컴포넌트 인벤토리. 시각 토큰은 [`tokens.json`](./tokens.json)을 따른다.

## 스펙 템플릿

각 컴포넌트는 다음 섹션을 갖는다:
- **목적** — 어디에 쓰이는가
- **변형(Variants)** — 크기·상태·강조도
- **상태(States)** — default / hover / active / disabled / loading
- **접근성** — aria-label·키보드·포커스 링
- **토큰 매핑** — 컬러·간격·radius

## Phase 1 인벤토리

### Primitive
- **Button** — primary / secondary / ghost / danger · sm / md / lg · icon-only
- **Input** — text / number / search · with prefix·suffix·clear
- **Textarea** — auto-grow, 글자 수 카운터
- **Checkbox / Toggle / Radio**
- **Avatar** — 24 / 32 / 48 / 72, fallback 이니셜
- **Badge / Chip** — info / success / warning / danger / subtle
- **GradeChip** — V-scale/Font/YDS, grade 컬러 토큰 매핑
- **Icon** — lucide 기반 세트

### Layout / Surface
- **Card** — 피드·암장·루트 공통 surface
- **Divider** — horizontal / vertical
- **EmptyState** — 일러스트 + 문구 + 액션
- **Skeleton** — 로딩 플레이스홀더
- **BottomSheet** (앱) / **Drawer** (웹)
- **Modal / Dialog**
- **Toast / Snackbar**
- **TabBar / SegmentedControl**

### Domain
- **FeedItem** — avatar · content · media carousel · actions (좋아요·댓글·공유) · 세션·암장 메타
- **RouteCard** — 썸네일 · grade · 세터 · 세팅일 · 완등자 수
- **GymCard** — 이름 · 거리 · 브랜드 · 세팅 주기 · 이미지
- **SessionSummary** — 오늘 시도 수·완등 수·최고 난이도 배지
- **AttemptRow** — 루트 · 결과(SEND/FLASH/ONSIGHT/TRY/FAIL) · 시도 횟수 · 미디어
- **CrewCard** (Phase 1.5)
- **PartnerMatchCard** (Phase 1.5)

## 상태·인터랙션 규약

- 터치 타겟 **최소 44×44 pt**
- 포커스 링 항상 표시 (키보드 사용자 대응)
- 성공 완등 제스처: Toast 대신 섬광+햅틱 피드백 (Motion as Feedback)
- 에러는 inline 먼저, 치명적 오류만 Dialog
- 빈 상태는 항상 1차 액션 버튼을 포함

## 이름 규약

- 컴포넌트 파일: `PascalCase.tsx`
- 스토리북(있을 경우) 경로: `packages/ui/<Component>/index.stories.tsx`
- 속성: `variant`, `size`, `tone`, `as`, `isLoading`, `isDisabled`

## 우선순위

1. **P0** — Button, Input, Card, Avatar, GradeChip, FeedItem
2. **P1** — Badge, Chip, Skeleton, EmptyState, Toast, BottomSheet
3. **P2** — TabBar, SegmentedControl, RouteCard, GymCard, SessionSummary
