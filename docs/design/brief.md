# Crimp 디자인 의뢰 브리프 (Toss-inspired)

> Claude Design 또는 외부 디자이너에게 전달하기 위한 프롬프트·브리프 원본.
> 변경 시 `docs/design/README.md` 와 `agents/design.md` 원칙과 충돌하지 않는지 확인한다.

## 제품 브리프

국내 클라이머를 위한 디지털 홈 플랫폼. 암장·루트 정보, 등반 세션·시도 기록, 크루/파트너 매칭, 피드 커뮤니티, 실내↔아웃도어 연계 가이드를 제공.

- 서비스명: **Crimp** (크림프 — 작은 홀드를 움켜쥐는 클라이밍 동작)
- 단계: Phase 1 MVP (2026-05 ~ 2026-07)
- 타깃: 20~40대 실내 볼더링·리드 클라이머, 월 2~8회 방문, 기록·커뮤니티 욕구 강함
- 플랫폼: iOS/Android 앱 (React Native) + 반응형 웹 (Next.js) — **모바일 우선**
- 기본 언어: 한국어 (영어 병행)

## 디자인 톤 — Toss-style 가이드

토스의 **신뢰감·깨끗함·데이터 중심** 톤을 등반 도메인에 이식.

- **광활한 여백**: 요소 간 간격을 과감하게. 스크롤은 길어도 OK, 밀도는 낮게.
- **큼직한 숫자/통계**: 완등 수·세션 수·그레이드 평균 등 수치를 헤드라인 크기로.
- **흰 바탕 + 강한 포인트 컬러 1개**: 기본은 순백(Light) / 깊은 차콜(Dark). 포인트는 단 하나 — 등반의 성취감을 상징하는 비비드 블루 또는 오렌지 1종 추천.
- **카드는 플랫 + 미세 그림자**: 테두리 없이 radius 16~20, shadow 는 아주 옅게.
- **타이포 강약 극명**: Heading 은 두껍고 크게, Body 는 얇고 차분하게. 중간 단계 최소화.
- **아이콘은 얇은 2px 아웃라인** + 필요한 곳만 Fill 로 강조.
- **마이크로카피는 친근한 존댓말** — "기록 완료" 보다 "잘했어요, 기록했어요" 톤.
- **모션은 스프링 기반 부드러움** — Linear 이징 배제, ease-out + spring.
- **로딩은 스켈레톤** — 스피너 대신 레이아웃 미리보기.
- **성공 피드백**은 제스처와 사운드·햅틱까지 고려 (완등 순간 하이라이트 애니메이션).

## 디자인 원칙 (`agents/design.md` 연동)

1. **Trust & Community First** — 클라이머가 서로를 신뢰할 수 있는 시각 언어
2. **Motion as Feedback** — 기록·완등 순간의 성취감을 마이크로 인터랙션으로
3. **Content over Chrome** — 영상·사진이 UI 보다 우선
4. **Accessible by default** — 색맹·저시력·한 손 조작 고려
5. 다크 모드 기본 지원 (Phase 1 부터)

## 디자인 토큰

### Color (Light)

- `bg.default` 순백 (#FFFFFF)
- `bg.subtle` 차가운 라이트 그레이 (#F5F7FA 계열)
- `text.primary` 거의 검정 (#0F1419 계열)
- `text.secondary` 중간 회색
- `text.tertiary` 플레이스홀더용 라이트 그레이
- `accent.primary` **포인트 컬러 1종** (토스 블루 톤 또는 등반감 오렌지 중 추천)
- `semantic.success / warning / danger / info`

### Color (Dark)

동일 구조, 깊은 차콜 배경 (#0F1419 ~ #1A1F2B 구간).

### Typography

- 한글 최우선: **Pretendard**
- Latin fallback: Inter
- 스텝: Display / H1 / H2 / Title / Body / Caption / Mono
- 각 스텝의 weight·line-height·letter-spacing 명시

### Spacing

`2, 4, 8, 12, 16, 20, 24, 32, 40, 56, 80`

### Radius

`8, 12, 16, 20, 28, full`

### Shadow

`none / xs (카드) / sm (플로팅) / lg (모달)` — 모두 옅게.

### Motion

- ease-out `200ms / 300ms / 450ms`
- spring (stiffness 180, damping 20)

## 화면 (우선순위 순)

### Phase 1 MVP 필수

1. **홈 (Home)** — 상단 큰 인사말 + 큼직한 "이번 주 세션 수/완등 수" 카드 + "세션 시작하기" 풀너비 CTA + 최근 암장·세션 리스트
2. **세션 시작 (Start Session)** — 단 3단계 (암장 → 시작 시각 → 시작). 각 단계는 전체 화면 전환.
3. **세션 상세 (Session Detail)** — 메타 카드(암장·시작 시각·경과 시간 라이브) + 시도 타임라인(세로) + 하단 고정 "시도 기록" FAB + 종료 버튼. 완등 순간엔 화면 전체 색 플래시.
   - 시도 필드: 루트(그레이드·색상), 결과(SEND/FLASH/ONSIGHT/TRY/FAIL), 시도 횟수, 메모
4. **내 세션 목록 (My Sessions)** — 월별 그룹, 카드형, pull-to-refresh, 커서 페이지네이션, 상단에 "이번 달 완등 N회" 요약 배너.
5. **암장 검색 (Gym Search)** — 검색바 + 최근 방문 칩 + 브랜드 필터 Bottom Sheet + 리스트/지도 토글.
6. **암장 상세 (Gym Detail)** — 헤더 이미지(없으면 그레이드별 색 그라디언트) + 기본 정보 + 활성 루트 목록(그레이드별 섹션, 칩으로 필터).
7. **로그인 (Kakao/Apple/Google)** — 소셜(Kakao 우선) 단일 탭, 설명은 1줄, 로고 큼직하게.
8. **내 프로필 (Me)** — 큼직한 아바타·닉네임·자가 등급 + 큰 숫자 통계 3종 (총 세션/총 완등/최고 그레이드) + 활동 히트맵.

### Phase 1.5 보조

9. 피드 (Feed), 크루/파트너 매칭, 미디어 업로드, 알림 센터

## 컴포넌트

- **Button**: primary (풀너비, radius 16, 큰 탭 타겟) / secondary (플랫 그레이) / ghost (텍스트만) / destructive
- **Input**: 하단 언더라인 대신 플랫 채움 (#F5F7FA) + 포커스 시 outline accent
- **Card**: 테두리 X, 그림자 xs, radius 16
- **Chip**: 필터/태그/그레이드 — pill 형, 선택 시 accent bg
- **Bottom Sheet**: 스냅 포인트 2~3개, 손잡이 바 표시
- **Toast**: 상단이 아닌 하단, 부드러운 슬라이드업
- **Nav**: 앱 하단 탭 (아이콘 + 짧은 레이블), 웹 상단 미니멀
- **Skeleton**: 모든 리스트·상세에 기본 적용
- **Empty state**: 일러스트 1개 + 짧은 카피 + 주 CTA

## 등반 도메인 요소

- **그레이드 뱃지** — V 스케일 (V0~V17), Font (6A~9A+), YDS (5.10a~5.15d) 모두 지원. 뱃지 bg 는 그레이드 난이도 구간별 연속 그라디언트(쉬움→어려움을 옅은 블루→진한 차콜 식으로). 숫자는 두껍게.
- **결과 마크** — SEND(완등)·FLASH(첫시도)·ONSIGHT(무정보 완등)·TRY(시도)·FAIL(실패) 아이콘 + 컬러 병행. 단색만으로 구분 금지.
- **루트 색상** — 실제 홀드 컬러 10종(빨/파/노/초/흰/검/핑/주/보/회)을 원형 점으로 간결하게.

## 접근성 요구

- WCAG AA 이상 · 본문 대비 4.5:1, 큰 텍스트 3:1
- 색상만으로 의미 전달 금지 (결과 마크에 아이콘 병행)
- 터치 44×44pt, 주 CTA 하단 배치 (한 손 엄지 도달권)
- 다이나믹 타입 대응 (iOS/Android)
- 스크린리더 레이블 명시
- 모션 감도 설정 대응 (`prefers-reduced-motion`)

## 산출물

1. **디자인 토큰 JSON** (`docs/design/tokens.json` 갱신 — W3C Design Tokens 포맷)
2. **컴포넌트 스펙** (`docs/design/components.md` — 변형·상태·토큰 매핑 매트릭스)
3. **하이파이 목업** — 주요 8개 화면, Light + Dark, iOS/Android/Web
4. **프로토타입** — 3개 플로우 (로그인→홈, 세션시작→시도기록→종료, 암장검색→상세)
5. **핸드오프 노트** — 토큰 네이밍 규약 + 컴포넌트 import 가이드 + 모션 스펙

## 레퍼런스

- **Toss** (신뢰/여백/큰 숫자) — 핵심 참조
- Strava (기록 시각화) · Linear (밀도 관리) · Cal.com (플랫 카드)
- **피해야 할 톤**: Crossfit 풍 그런지, 네온 그라디언트, 과도한 게이미피케이션, Material 풍 진한 그림자
