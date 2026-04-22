import { z } from 'zod';

/**
 * Attempt(시도) 관련 zod 스키마.
 *
 * 참조:
 * - api/crimp-api/src/main/java/io/crimp/api/log/AttemptController.java
 * - api/crimp-core/src/main/java/io/crimp/core/entity/enums/AttemptResult.java
 *
 * 백엔드 BigDecimal 은 JSON number 로 직렬화되므로 `z.number()` 로 받는다
 * (정밀도 유실 위험은 현재 등급 범위에서는 안전).
 */

/** `AttemptResult` 백엔드 enum 과 동기화된 zod enum. */
export const AttemptResultSchema = z.enum([
  'SEND',
  'FLASH',
  'ONSIGHT',
  'TRY',
  'FAIL',
]);

export type AttemptResult = z.infer<typeof AttemptResultSchema>;

export const ATTEMPT_RESULTS: readonly AttemptResult[] = [
  'SEND',
  'FLASH',
  'ONSIGHT',
  'TRY',
  'FAIL',
] as const;

/** 백엔드 `AttemptResponse`. */
export const AttemptSchema = z.object({
  extId: z.string(),
  routeId: z.number().nullable(),
  gymId: z.number().nullable(),
  gradeValue: z.string().nullable(),
  gradeNumeric: z.number().nullable(),
  result: AttemptResultSchema,
  // 백엔드가 int 로 직렬화 (primitive) — null 이 아님.
  attempts: z.number().int().min(1).max(999),
  mediaId: z.number().nullable(),
  note: z.string().nullable(),
  tagsJson: z.string().nullable(),
  loggedAt: z.string(),
});

export type Attempt = z.infer<typeof AttemptSchema>;

/** `GET /sessions/{sessionExtId}/attempts` 응답. */
export const AttemptListSchema = z.object({
  data: z.array(AttemptSchema),
});

export type AttemptList = z.infer<typeof AttemptListSchema>;

/**
 * `POST /sessions/{sessionExtId}/attempts` 요청 본문.
 *
 * 필수 필드는 백엔드 계약상 실질적으로 `result` 만 논리적으로 필수이지만,
 * `attempts` 는 `@Min(1) @Max(999)` 검증. 사용자에게 반드시 입력받을 필드 최소 세트.
 */
export const LogAttemptBodySchema = z.object({
  routeId: z.number().int().nullable().optional(),
  gymId: z.number().int().nullable().optional(),
  // 백엔드 `@Size(max = 10)`.
  gradeValue: z.string().max(10).nullable().optional(),
  gradeNumeric: z.number().nullable().optional(),
  result: AttemptResultSchema,
  attempts: z.number().int().min(1).max(999),
  mediaId: z.number().int().nullable().optional(),
  // 백엔드 `@Size(max = 300)`.
  note: z.string().max(300).nullable().optional(),
  tagsJson: z.string().nullable().optional(),
  loggedAt: z.string().nullable().optional(),
});

export type LogAttemptBody = z.infer<typeof LogAttemptBodySchema>;

/**
 * `PATCH /attempts/{extId}` 요청 본문.
 *
 * 모든 필드 optional. 백엔드는 null 과 미전송을 같은 의미로 취급.
 * `loggedAt` 은 수정 계약에 없음 (`UpdateAttemptRequest` 참조).
 */
export const UpdateAttemptBodySchema = z.object({
  routeId: z.number().int().nullable().optional(),
  gymId: z.number().int().nullable().optional(),
  gradeValue: z.string().max(10).nullable().optional(),
  gradeNumeric: z.number().nullable().optional(),
  result: AttemptResultSchema.optional(),
  attempts: z.number().int().min(1).max(999).optional(),
  mediaId: z.number().int().nullable().optional(),
  note: z.string().max(300).nullable().optional(),
  tagsJson: z.string().nullable().optional(),
});

export type UpdateAttemptBody = z.infer<typeof UpdateAttemptBodySchema>;
