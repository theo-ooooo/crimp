import { z } from 'zod';

/**
 * `GET /api/v1/health` 응답 스키마.
 *
 * 참조: api/crimp-api/src/main/java/io/crimp/common/web/HealthController.java
 */
export const HealthResponseSchema = z.object({
  status: z.string(),
  brand: z.string(),
  env: z.string(),
  serverTime: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
