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
  loggedAt: z.string(),
});

export type Attempt = z.infer<typeof AttemptSchema>;

export const AttemptListSchema = z.object({
  data: z.array(AttemptSchema),
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
});

export type UpdateAttemptBody = z.infer<typeof UpdateAttemptBodySchema>;
