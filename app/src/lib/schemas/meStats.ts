import { z } from 'zod';

/**
 * `GET /api/v1/me/stats` 응답 스키마 (envelope 내부 payload).
 *
 * 참조: api/crimp-api/src/main/java/io/crimp/api/user/UserController.java (MeStatsResponse)
 * 주 경계는 백엔드에서 KST (Asia/Seoul) 기준으로 계산된다.
 */
export const MeStatsSchema = z.object({
  weekSessions: z.number().int().nonnegative(),
  weekSends: z.number().int().nonnegative(),
  totalSessions: z.number().int().nonnegative(),
  totalSends: z.number().int().nonnegative(),
  topGrade: z.string().nullable(),
  weekRange: z.object({
    start: z.string(), // ISO 날짜 YYYY-MM-DD
    end: z.string(),
  }),
});

export type MeStats = z.infer<typeof MeStatsSchema>;
