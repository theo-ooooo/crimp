import { z } from 'zod';

/**
 * Attempt(시도) 관련 zod 스키마 (앱).
 *
 * 참조:
 * - api/crimp-api/src/main/java/io/crimp/api/log/AttemptController.java
 * - api/crimp-core/src/main/java/io/crimp/core/entity/enums/AttemptResult.java
 */

export const AttemptResultSchema = z.enum([
  'SEND',
  'FLASH',
  'ONSIGHT',
  'TRY',
  'FAIL',
]);

export type AttemptResult = z.infer<typeof AttemptResultSchema>;

/**
 * 홀드 색 화이트리스트 (PR #93, F5 PR-4 — 리뷰 S1). 백엔드 `AttemptService.ALLOWED_HOLD_COLORS`
 * 와 동일 셋. 클라가 상위 컴포넌트에서 사용하는 `HoldColorKey` (theme.hold 키) 와도 일치.
 */
export const HoldColorSchema = z.enum([
  'red',
  'blue',
  'yellow',
  'green',
  'white',
  'black',
  'pink',
  'orange',
  'purple',
  'gray',
]);
export type HoldColor = z.infer<typeof HoldColorSchema>;

export const ATTEMPT_RESULTS: readonly AttemptResult[] = [
  'SEND',
  'FLASH',
  'ONSIGHT',
  'TRY',
  'FAIL',
] as const;

export const AttemptSchema = z.object({
  extId: z.string(),
  routeId: z.number().nullable(),
  gymId: z.number().nullable(),
  gradeValue: z.string().nullable(),
  gradeNumeric: z.number().nullable(),
  result: AttemptResultSchema,
  attempts: z.number().int().min(1).max(999),
  mediaId: z.number().nullable(),
  note: z.string().nullable(),
  tagsJson: z.string().nullable(),
  /** 홀드 색 (PR #93, F5 PR-4). 미저장 시 null. legacy row 가 알 수 없는 값을 가질 수
   *  있으므로 enum 대신 string — UI 의 HoldDot 이 fallback 처리. */
  holdColor: z.string().nullable(),
  loggedAt: z.string(),
});

export type Attempt = z.infer<typeof AttemptSchema>;

export const AttemptListSchema = z.object({
  items: z.array(AttemptSchema),
});

export type AttemptList = z.infer<typeof AttemptListSchema>;

export const LogAttemptBodySchema = z.object({
  routeId: z.number().int().nullable().optional(),
  gymId: z.number().int().nullable().optional(),
  gradeValue: z.string().max(10).nullable().optional(),
  gradeNumeric: z.number().nullable().optional(),
  result: AttemptResultSchema,
  attempts: z.number().int().min(1).max(999),
  mediaId: z.number().int().nullable().optional(),
  note: z.string().max(300).nullable().optional(),
  tagsJson: z.string().nullable().optional(),
  // [PR #93 리뷰 S1] 작성/수정 body 는 enum 으로 좁혀 잘못된 값을 클라 단에서 차단.
  holdColor: HoldColorSchema.nullable().optional(),
  loggedAt: z.string().nullable().optional(),
});

export type LogAttemptBody = z.infer<typeof LogAttemptBodySchema>;

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
  holdColor: HoldColorSchema.nullable().optional(),
});

export type UpdateAttemptBody = z.infer<typeof UpdateAttemptBodySchema>;
