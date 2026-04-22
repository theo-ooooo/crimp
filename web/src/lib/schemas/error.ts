import { z } from 'zod';

/**
 * 백엔드 `ErrorResponse` envelope 에 대응한다.
 *
 * 참조: api/crimp-common/src/main/java/io/crimp/common/response/ErrorResponse.java
 *
 * ```json
 * {
 *   "error": {
 *     "code": "AUTH_EXPIRED",
 *     "message": "Access token expired",
 *     "details": { "field": "token" }
 *   }
 * }
 * ```
 */
export const ErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).nullable().optional(),
});

export const ErrorResponseSchema = z.object({
  error: ErrorBodySchema,
});

export type ErrorBody = z.infer<typeof ErrorBodySchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
