import { z } from 'zod';

/**
 * 백엔드 `ApiResponse<T>` envelope 에 대응한다.
 *
 * 참조: api/crimp-common/src/main/java/io/crimp/common/response/ApiResponse.java
 *
 * 성공:
 * ```json
 * { "status": true, "data": <payload> }
 * ```
 *
 * 실패:
 * ```json
 * { "status": false, "error": { "code": "AUTH_EXPIRED", "message": "...", "details": {...} } }
 * ```
 */

export const ErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).nullable().optional(),
});

export type ErrorBody = z.infer<typeof ErrorBodySchema>;

/** 성공 envelope. `data` 는 호출부에서 자체 스키마로 검증한다. */
export const ApiSuccessEnvelopeSchema = z.object({
  status: z.literal(true),
  data: z.unknown(),
});

/** 실패 envelope. HTTP status 는 별도로 전달된다. */
export const ApiFailureEnvelopeSchema = z.object({
  status: z.literal(false),
  error: ErrorBodySchema,
});

/** 성공/실패 판별용 discriminated union. */
export const ApiEnvelopeSchema = z.discriminatedUnion('status', [
  ApiSuccessEnvelopeSchema,
  ApiFailureEnvelopeSchema,
]);

export type ApiEnvelope = z.infer<typeof ApiEnvelopeSchema>;
