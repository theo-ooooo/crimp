import { z } from 'zod';

/**
 * Session 관련 zod 스키마 (앱).
 *
 * 참조:
 * - api/crimp-api/src/main/java/io/crimp/api/log/SessionController.java
 */

export const SessionSchema = z.object({
  extId: z.string(),
  gymId: z.number().nullable(),
  gymNameRaw: z.string().nullable(),
  // Instant ISO-8601 문자열로 수신.
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  // 백엔드 Short 계약 범위 유지.
  durationMin: z.number().int().min(-32768).max(32767).nullable(),
  note: z.string().nullable(),
  // 백엔드 Byte 계약 범위 유지.
  condition: z.number().int().min(-128).max(127).nullable(),
});

export type Session = z.infer<typeof SessionSchema>;

export const SessionPageSchema = z.object({
  nextCursor: z.number().nullable(),
  size: z.number().int(),
});

export type SessionPage = z.infer<typeof SessionPageSchema>;

export const SessionListSchema = z.object({
  data: z.array(SessionSchema),
  page: SessionPageSchema,
});

export type SessionList = z.infer<typeof SessionListSchema>;

export const StartSessionBodySchema = z.object({
  gymId: z.number().int().nullable().optional(),
  gymNameRaw: z.string().max(100).nullable().optional(),
  startedAt: z.string(),
});

export type StartSessionBody = z.infer<typeof StartSessionBodySchema>;

export const UpdateSessionBodySchema = z.object({
  endedAt: z.string().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  condition: z.number().int().min(-128).max(127).nullable().optional(),
});

export type UpdateSessionBody = z.infer<typeof UpdateSessionBodySchema>;
