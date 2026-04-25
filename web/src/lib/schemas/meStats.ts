import { z } from 'zod';

/**
 * `GET /api/v1/me/stats` 응답 스키마.
 *
 * 참조: api/crimp-api/src/main/java/io/crimp/api/user/UserController.java
 *  `MeStatsResponse(weekSessions, weekSends, totalSessions, totalSends, topGrade, weekRange)`.
 *
 * - 모든 카운트는 백엔드 Long → JSON number 직렬화. 비음수 정수 보장.
 * - `topGrade` 는 미달성 시 null.
 * - `weekRange.{start,end}` 는 KST 기준 ISO `YYYY-MM-DD` 문자열.
 */
export const MeStatsSchema = z.object({
  weekSessions: z.number().int().nonnegative(),
  weekSends: z.number().int().nonnegative(),
  totalSessions: z.number().int().nonnegative(),
  totalSends: z.number().int().nonnegative(),
  topGrade: z.string().nullable(),
  weekRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

export type MeStats = z.infer<typeof MeStatsSchema>;
