# @crimp/web

Next.js 14 App Router 기반 랜딩 · 관리자 콘솔.

## 로컬 실행

```bash
pnpm install
pnpm dev
```

<http://localhost:3000>

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript 타입 체크 |
| `pnpm test` | Vitest |

## 구성

- Next.js 14 (App Router)
- TypeScript strict
- Tailwind CSS
- TanStack Query (서버 상태)
- zod (런타임 검증)

세부 규약은 [`../agents/frontend.md`](../agents/frontend.md).
