import { z } from 'zod';

/**
 * Session 관련 zod 스키마.
 *
 * 참조:
 * - api/crimp-api/src/main/java/io/crimp/api/log/SessionController.java
 *   (`SessionResponse`, `StartSessionRequest`, `UpdateSessionRequest`, `Page`)
 *
 * 백엔드 nullable 직렬화 필드는 zod `.nullable()` 로 미러링.
 * `levelSelf` 선례처럼 백엔드 계약 범위를 정확히 반영하고, 지나치게 좁히지 않는다.
 */

/** 백엔드 `SessionResponse`. */
export const SessionSchema = z.object({
  extId: z.string(),
  gymId: z.number().nullable(),
  gymNameRaw: z.string().nullable(),
  // 서버는 Instant ISO-8601 문자열로 직렬화한다. UI 는 string 그대로 받고 포맷만 변환.
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  // 백엔드 Short (-32768~32767). 비즈니스상 0~1440 정도지만 계약 범위 유지.
  durationMin: z.number().int().min(-32768).max(32767).nullable(),
  note: z.string().nullable(),
  // 백엔드 Byte (-128~127). 1~5 척도이나 계약 범위 유지.
  condition: z.number().int().min(-128).max(127).nullable(),
});

export type Session = z.infer<typeof SessionSchema>;

/** 백엔드 `Page`. */
export const SessionPageSchema = z.object({
  nextCursor: z.number().nullable(),
  size: z.number().int(),
});

export type SessionPage = z.infer<typeof SessionPageSchema>;

/** `GET /me/sessions` 응답. */
export const SessionListSchema = z.object({
  data: z.array(SessionSchema),
  page: SessionPageSchema,
});

export type SessionList = z.infer<typeof SessionListSchema>;

/**
 * `POST /sessions` 요청 본문.
 *
 * 백엔드는 모두 nullable 허용. 최소 `startedAt` 만 확실하면 OK.
 * `gymNameRaw` 최대 100자는 백엔드 `@Size(max = 100)` 과 동기화.
 */
export const StartSessionBodySchema = z.object({
  gymId: z.number().int().nullable().optional(),
  gymNameRaw: z.string().max(100).nullable().optional(),
  startedAt: z.string(),
});

export type StartSessionBody = z.infer<typeof StartSessionBodySchema>;

/**
 * `PATCH /sessions/{extId}` 요청 본문.
 *
 * note 500자 제한은 백엔드 `@Size(max = 500)` 과 동기화.
 */
export const UpdateSessionBodySchema = z.object({
  endedAt: z.string().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  condition: z.number().int().min(-128).max(127).nullable().optional(),
});

export type UpdateSessionBody = z.infer<typeof UpdateSessionBodySchema>;
