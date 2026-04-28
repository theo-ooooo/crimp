# MainGym Onboarding Gate — 기획

| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-04-28 |
| 작성자 | 강경원 (kwkang@ssrinc.co.kr) |
| 상태 | Draft (GATE 1 승인 대기) |
| 대상 범위 | Phase 1 MVP M2 차단요건 해소 |
| 상위 문서 | [PRD §6.1 M2](./prd.md#6.1-must-have-phase-1-3개월) / [user-story.md](./user-story.md) |

---

## 1. 한 줄 정의

> **로그인 직후 mainGym 이 비어 있으면 풀스크린 게이트를 띄운다 (skip 가능, 다음 로그인에 재노출).**

## 2. 문제 정의

PRD §6.1 M2 가 "🟡 백엔드 OK · UI 일부 / my-gym 필터 차단요인" 으로 정체. 원인:

| 문제 | 현 상태 | 영향 |
| --- | --- | --- |
| mainGym 설정 진입점이 ProfileScreen 한 곳뿐 | 신규 가입자가 수동으로 프로필 → 카드 → picker 까지 4번 탭 | 설정률↓ |
| 설정 안 한 채로 my-gym 피드 진입 가능 | 빈 피드 + "mainGym 미설정" 안내만 | 핵심 KPI(주간 로그 작성률) 직격 |
| 온보딩 플로우 자체가 부재 | 로그인 → 홈 → 끝 | 어떤 가치 제안도 못 띄움 |

## 3. 목표 / 비목표

### 3.1 목표
- **G1.** 신규 가입자의 mainGym 설정률을 베타 기준 ≥80% 까지 끌어올린다 (현재 측정 0%, 추정).
- **G2.** my-gym 피드가 "Phase 1 핵심 페르소나(현우)" 의 첫 세션부터 컨텐츠를 가질 수 있게 한다.
- **G3.** 강제 진입 + 명시적 skip 으로 결정 권한은 유저에게 남긴다 (강제로 막지 않음).

### 3.2 비목표 (Phase 1 에서 다루지 않음)
- 위치 기반 자동 추천 (Phase 1.5+)
- 다중 mainGym (홈/제2 암장) — 단일 mainGym 모델 유지
- 크루·파트너 매칭과의 연동
- 변경 이력 (`profile_main_gym_history`) 추적

## 4. 유저 스토리

> **현우 (중급자, 첫 가입)** — "로그인하자마자 '주로 가는 암장이 어디예요?' 묻는 화면이 떴다. 검색해서 더클라임 강남점 골랐고, 다음부터는 my-gym 피드에 친구 세션이 바로 보인다."

> **지수 (입문자, 첫 가입)** — "어떤 암장을 골라야 할지 모르겠어서 '나중에 정할게요' 눌렀다. 홈에 '메인 암장 정하기' 배너가 떠 있어서 며칠 후 거기서 설정했다."

> **현우 (재로그인, 이미 mainGym 있음)** — "로그인했더니 그냥 홈으로 갔다. 아무것도 막지 않음."

## 5. 사양

### 5.1 트리거 조건

| 조건 | 동작 |
| --- | --- |
| 로그인 직후 `me.mainGym === null` | OnboardingGate 표시 |
| `mainGym !== null` | 곧장 홈으로 |

skip 은 **현재 앱 실행 / 현재 브라우저 세션** 한정 (메모리 상 dismiss). 앱 재시작·웹 새로고침·재로그인 시 mainGym 이 여전히 null 이면 게이트가 다시 뜬다. 명시적인 "영원히 skip" 옵션은 두지 않는다 (M2 차단요건 해소 목적상 노출 빈도를 낮추지 않음).

### 5.2 화면 구성 (앱·웹 공통 컨셉)

**OnboardingGate** — 풀스크린, 뒤로가기 차단(앱은 hardware back 누르면 종료 confirm), 2 액션:

```
┌──────────────────────────────────┐
│ 어디서 주로 등반하세요?           │
│                                  │
│ [   암장 검색 (autocomplete)   ] │
│                                  │
│ ┌──────────────────────────┐     │
│ │ 더클라임 강남점          │     │
│ │ 더클라임 / 강남구         │     │
│ └──────────────────────────┘     │
│                                  │
│ [ 이 암장으로 설정 ]              │
│                                  │
│ [ 나중에 정할게요 (skip)  ]      │
└──────────────────────────────────┘
```

- 검색은 기존 `GET /api/v1/gyms?q=...` 재사용.
- 결과 1행 선택 → 1차 강조 → CTA 활성화.
- skip 누르면 클라이언트 메모리상 dismiss 후 홈으로 (서버 호출 없음).
- 별도의 "암장 모름" 옵션 없음 — skip 으로 통합.

**FeedScreen 의 my-gym 빈 상태 강화 (스코프 외, 참고)** — 게이트를 skip 한 유저가 my-gym 탭에 진입했을 때 빈 결과 안내에 "메인 암장 설정하기" CTA 가 이미 있는지 확인 후 없으면 별도 PR.

### 5.3 데이터 모델 변경

**없음.** skip 상태를 서버에 영속하지 않으므로 컬럼 추가 / 마이그레이션 불필요. mainGym 설정은 기존 `profile.main_gym_id` 컬럼으로 충분.

### 5.4 API 변경

| 엔드포인트 | 변경 |
| --- | --- |
| `GET /api/v1/me` | 변경 없음 (`mainGym` 필드는 PR #59 부터 이미 있음) |
| `PATCH /api/v1/me` (기존) | 변경 없음 — OnboardingGate 의 set 동작은 기존 `{ mainGymExtId }` 호출 그대로 사용 |

신규 엔드포인트 없음.

### 5.5 라우팅 / 가드

**App (React Navigation)** — `RootNavigator` 에 분기 1개 추가. 클라이언트 메모리(zustand) 의 `onboardingDismissedThisSession: boolean` 으로 현재 실행 한정 skip 표현:

```
accessToken === null                          → AuthStack (Login)
me === undefined                              → SplashScreen (loading)
me.mainGym === null
  && !onboardingDismissedThisSession          → OnboardingStack (OnboardingGymScreen)
otherwise                                     → MainStack (BottomTabs)
```

`onboardingDismissedThisSession` 은 앱 종료/재시작 시 휘발 (persist 안 함). 로그아웃 시 `clear()` 에서 같이 false 로.

**Web (Next.js)** — client-side 라우트 가드:

- 보호 페이지 root layout 에서 `useMe()` + sessionStorage 기반 `onboardingDismissed` flag 확인 → `mainGym === null && !dismissed` 면 `/onboarding/main-gym` 으로 replace.
- `/onboarding/main-gym` 페이지는 인증 상태에서만 접근 가능. 설정 완료 시 홈으로 replace, skip 시 `sessionStorage.setItem('crimp.onboarding.dismissed','1')` 후 홈으로 replace.
- 새 탭 / 새 세션 → sessionStorage 비어 있으므로 게이트 재노출.

### 5.6 i18n 키 (ko 우선)

```
onboarding.mainGym.title = "어디서 주로 등반하세요?"
onboarding.mainGym.subtitle = "my-gym 피드와 추천에 사용돼요. 언제든 프로필에서 바꿀 수 있어요."
onboarding.mainGym.searchPlaceholder = "암장 이름 검색"
onboarding.mainGym.confirmCta = "이 암장으로 설정"
onboarding.mainGym.skipCta = "나중에 정할게요"
onboarding.mainGym.exitConfirmTitle = "이 화면에서 나가시겠어요?"
onboarding.mainGym.exitConfirmBody = "메인 암장은 다음에 다시 물어볼게요."
```

영문 (`en.json`) 도 1:1 추가.

### 5.7 엣지 케이스

| 케이스 | 동작 |
| --- | --- |
| skip 직후 같은 세션에서 ProfileScreen → mainGym 설정 | 정상 저장. me 캐시 invalidate 로 게이트 조건 자동 해제 |
| OnboardingGate 에서 검색 0건 | "찾는 암장이 없나요? 나중에 정해도 됩니다" 보조문 |
| 네트워크 오류 (gyms 검색 실패) | inline 에러 + 재시도 버튼, skip 은 여전히 가능 |
| 설정 호출 (PATCH /me) 실패 | 토스트 + 게이트 유지 — 명시적 set 의도가 저장 안 된 채로 통과시키지 않는다 |
| mainGym 으로 골랐던 암장이 비활성화/삭제 | 백엔드가 이미 `me.mainGym = null` 로 응답 (PR #59) → 다음 로그인 때 게이트 재노출 |
| 다른 기기에서 mainGym 설정한 유저 | `me` 가 서버 단일 소스이므로 mainGym ≠ null → 게이트 안 뜸 |
| 같은 기기에서 skip 후 앱 백그라운드 → 포그라운드 (재실행 아님) | 메모리 살아있음 → 게이트 안 뜸 (현 세션 유지) |

## 6. 측정

| 지표 | 정의 | 목표 (베타 ~ 6개월) |
| --- | --- | --- |
| OnboardingGate 도달률 | 신규 가입 유저 중 게이트가 한 번이라도 표시된 비율 | 100% |
| mainGym 설정률 (가입 후 1주) | 가입 7일 시점에 mainGym 이 set 된 유저 비율 | ≥80% |
| my-gym 피드 빈 응답 비율 | mainGym 미설정으로 빈 결과를 받은 요청 비율 | <5% (베타 기준) |

이벤트:
- `onboarding_maingym_shown` (게이트 노출 시)
- `onboarding_maingym_set` (set 으로 종료, with `gym_ext_id`)
- `onboarding_maingym_skipped` (skip 으로 종료)

> Phase 1 에는 분석 이벤트 파이프라인이 아직 없으므로(PRD §11), 위 이벤트는 베타 직전 또는 분석 도구 도입과 함께 활성화. 그 전까지 측정은 DB 기반(가입 후 7일 mainGym 채움 비율) 으로 대체.

## 7. 리스크 & 미결 사항

### 리스크
| 리스크 | 대응 |
| --- | --- |
| seed 암장이 30곳 미만이면 검색이 빈약 | M3(암장 Seed) 와 동시에 진행하는 편이 유저 경험상 안전 |
| skip 후 영구 배너가 거슬릴 수 있음 | dismiss 는 세션 단위로만, 재로그인에 다시 노출 |
| 강제 게이트가 첫 인상을 망칠 수 있음 | skip 옵션을 명시적으로 제공, "나중에" 라는 표현 사용 |

### 결정 (2026-04-28)
1. **skip 후 다음 로그인 때 재노출** — 채택. mainGym 이 비어 있는 동안은 매 앱 실행 / 매 웹 세션마다 게이트 재노출. 클라이언트 메모리 dismiss 만 (DB·서버 상태 없음). M2 차단요건 해소를 우선 가치로 둠.
2. **"암장 모름" 옵션 → skip 으로 통합** — 채택. 별도 버튼 없음.

### Open Questions (구현 단계 확인)
- **mainGym 변경 시 my-gym 피드 캐시 무효화 범위** — `useUpdateProfile.ts` 가 `feed` 쿼리 invalidate 중. 설계/구현 단계에서 1회 검증 후 추가 작업 불필요한지 확정.

## 8. 다음 액션

GATE 1 승인 후:
1. `/설계시작` — 라우팅 가드 시퀀스 다이어그램, OnboardingGate 컴포넌트 인터페이스, my-gym 빈 상태 처리 보강 검토 (DB·API 스펙 변경은 없음 — 백엔드 작업 최소)
2. GATE 2 승인 후 `/frontend시작` (App: OnboardingStack + RootNavigator 가드, Web: `/onboarding/main-gym` 페이지 + layout 가드, i18n 키 추가) 단일 영역. 백엔드 변경은 없음.

## 변경 이력

| 일자 | 변경 |
| --- | --- |
| 2026-04-28 | 최초 작성 (Draft) |
| 2026-04-28 | 미결 1·2 결정 반영: skip 재노출 + "암장 모름" 통합. DB 컬럼·skip API 제거. |
