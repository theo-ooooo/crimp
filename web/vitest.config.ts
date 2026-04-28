import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Vitest 설정.
 *
 * - `@/` 경로 alias 를 `web/src` 로 매핑 — Next.js `tsconfig.json` paths 와 동일.
 * - 기본 environment 는 `jsdom` — sessionStorage / window 등 브라우저 API 를 사용하는
 *   파일(`onboardingDismiss.test.ts` 등) 이 추가 directive 없이 동작.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
