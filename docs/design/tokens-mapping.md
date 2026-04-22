# Token 네이밍 매핑 (web ↔ app ↔ CSS ↔ Tailwind)

한 토큰이 4군데(JSON 원본 · TS export · CSS 변수 · Tailwind 클래스)에서 다른 표기를 쓰기 때문에
아래 표가 **단일 참조**. 새 토큰 추가 시 네 칸 모두 채운다.

> JSON 은 W3C Design Tokens Community Group 포맷 (`$value` / `$type` / `$description`) 을 따른다.
> Style Dictionary 등 외부 도구 연결 시 그대로 파싱 가능.

## 규약

- JSON 계층은 `.` 점 표기 (`color.accent.base`).
- TS export 는 camelCase (`colors.accent.base`, `colors.light.subtle2`).
- CSS 변수는 kebab-case + 접두어 `--color-` / `--shadow-` / `--motion-` / `--radius-`.
- Tailwind 클래스는 CSS 변수를 래핑하므로 이름 충돌 방지용 kebab 유지 (`bg-subtle-2`).

## 색상

| JSON (tokens.json) | Web TS (`web/src/lib/tokens.ts`) | App TS (`app/src/lib/tokens.ts`) | CSS var | Tailwind class |
| --- | --- | --- | --- | --- |
| `color.accent.base` | `colors.accent.base` | `accent.base` | `--color-accent` | `bg-accent` / `text-accent` |
| `color.accent.soft` | `colors.accent.soft` | `accent.soft` | `--color-accent-soft` | `bg-accent-soft` |
| `color.accent.ink` | `colors.accent.ink` | `accent.ink` | `--color-accent-ink` | `text-accent-ink` |
| `color.accent.flash` | `colors.accent.flash` | `accent.flash` | `--color-accent-flash` | `bg-accent-flash` |
| `color.accent.on` | `colors.accent.on` | `accent.on` | `--color-accent-on` | `text-accent-on` |
| `color.neutral.light.bg` | `colors.light.bg` | `theme.bg` (mode=light) | `--color-bg` | `bg-bg` |
| `color.neutral.light.subtle` | `colors.light.subtle` | `theme.subtle` | `--color-subtle` | `bg-subtle` |
| `color.neutral.light.subtle2` | `colors.light.subtle2` | `theme.subtle2` | `--color-subtle-2` | `bg-subtle-2` |
| `color.neutral.light.hairline` | `colors.light.hairline` | `theme.hairline` | `--color-hairline` | `border-hairline` |
| `color.neutral.light.chip` | `colors.light.chip` | `theme.chip` | `--color-chip` | `bg-chip` |
| `color.neutral.light.text` | `colors.light.text` | `theme.text` | `--color-text` | `text-text` |
| `color.neutral.light.text2` | `colors.light.text2` | `theme.text2` | `--color-text-2` | `text-text-2` |
| `color.neutral.light.text3` | `colors.light.text3` | `theme.text3` | `--color-text-3` | `text-text-3` |
| `color.neutral.light.text4` | `colors.light.text4` | `theme.text4` | `--color-text-4` | `text-text-4` |
| `color.semantic.success` | `colors.semantic.success` | `semantic.success` | `--color-success` | `text-success` |
| `color.semantic.warning` | `colors.semantic.warning` | `semantic.warning` | `--color-warning` | `text-warning` |
| `color.semantic.danger` | `colors.semantic.danger` | `semantic.danger` | `--color-danger` | `text-danger` |

> **다크 모드**: CSS 변수는 `prefers-color-scheme: dark` 블록에서 같은 이름으로 덮어쓰므로 클래스명은 그대로.
> App 쪽은 `useTokens()` 훅이 `themeLight` / `themeDark` 중 하나를 반환.

## 그레이드 (V-scale)

- Web: `gradeTint(v)` → `{ bg: oklch(...), fg: '#...' }` (CSS `color()` 지원 브라우저)
- App: `gradeTint(v)` → RGB 근사 hex (`gradeHex`)
- JSON: `color.grade.v0` ~ `v10` 에 원본 oklch 문자열 보관

## 홀드 컬러

JSON `color.hold.*` (red/blue/yellow/green/white/black/pink/orange/purple/gray).
Web/App TS 모두 `colors.hold.*` / `theme.hold.*` 로 접근.

## Shadow

| Light | Dark | CSS var |
| --- | --- | --- |
| `shadow.xs` | `shadow.dark.xs` | `--shadow-xs` |
| `shadow.sm` | `shadow.dark.sm` | `--shadow-sm` |
| `shadow.lg` | `shadow.dark.lg` | `--shadow-lg` |

App 쪽은 `shadow.xs` 가 `{ shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation }` 객체.
iOS + Android 동시 대응이 필요하므로 **픽셀 값은 web 과 다를 수 있음**. 지각적 밝기를 맞춘 튜닝 값.

## Motion

| 용도 | CSS | App (ms) |
| --- | --- | --- |
| fast (탭 피드백) | `var(--motion-fast)` = 200ms | `motion.duration.fast = 200` |
| normal (전환) | `var(--motion-normal)` = 300ms | `motion.duration.normal = 300` |
| slow (강조) | `var(--motion-slow)` = 450ms | `motion.duration.slow = 450` |
| 스프링 | — | `motion.spring = { stiffness: 180, damping: 20 }` |

## 변경 절차

토큰을 추가/수정할 때:

1. `docs/design/tokens.json` 를 먼저 갱신 (단일 진실원)
2. `web/src/lib/tokens.ts`, `web/app/globals.css`, `web/tailwind.config.ts` 동기화
3. `app/src/lib/tokens.ts` 동기화
4. 이 매핑 표에 한 줄 추가
5. 사용 예시가 바뀌면 `components.md` 갱신

네 군데 중 하나만 바뀌어 있으면 **PR 블로커**.
