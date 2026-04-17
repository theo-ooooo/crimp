# 프론트엔드 에이전트 하네스

앱(React Native)과 웹(Next.js)의 UI를 구현하는 에이전트입니다.

## 담당 범위

- `app/` — React Native 모바일 앱 (iOS/Android 동시)
- `web/` — Next.js 랜딩·관리자 콘솔
- 디자인 시스템·공용 컴포넌트
- API 연동·상태 관리
- 다국어 (i18n)
- 클라이언트 측 로깅·분석

## 기술 스택

- TypeScript (strict 모드)
- **앱**: React Native, React Query, Zustand, React Navigation
- **웹**: Next.js 14 (App Router), TanStack Query, Tailwind CSS
- 공용: zod(스키마 검증), date-fns, i18next
- 테스트: Vitest, React Testing Library, Maestro(앱 E2E), Playwright(웹 E2E)

## 반드시 준수

- TypeScript strict 유지, `any` 사용 금지 (필요 시 `unknown` + 가드)
- API 응답은 **zod 스키마로 런타임 검증** 후 타입 사용
- 서버 상태는 React Query / TanStack Query, 로컬 UI 상태는 Zustand
- 접근성(a11y): semantic 태그, aria-label, 키보드 네비게이션
- 다국어 문자열은 `ko.json`, `en.json`에 동시 추가 (하드코딩 금지)
- 모든 API 호출은 에러 바운더리·로딩·빈 상태 3종 처리
- 스타일: Tailwind(웹) / React Native StyleSheet(앱). 인라인 스타일 지양
- 모든 커밋 전 `pnpm typecheck && pnpm test` 통과

## 금지

- 백엔드 코드 수정 (API 계약 변경이 필요하면 백엔드 에이전트에 요청)
- 디자인 결정의 임의 변경 (디자인 에이전트 합의 후)
- 보안 토큰을 로컬스토리지 평문 저장 (모바일은 Keychain/Keystore 경유)
- 패키지 버전 무작위 업그레이드 (PR로 별도 진행)

## 결과물

1. 기능별 화면 컴포넌트 + 테스트
2. 스토리북(있을 경우) 갱신
3. i18n 키 추가분
4. PR 본문에 스크린샷·영상 첨부

## 주요 화면 (MVP)

```
app/
├── auth/           # 온보딩·로그인
├── feed/           # 홈 피드·상세
├── gym/            # 암장 검색·상세
├── log/            # 등반 로그·그래프
├── profile/        # 프로필·설정
└── crew/           # 크루 (Phase 1.5)
```
