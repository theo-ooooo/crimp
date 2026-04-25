import { z } from 'zod';

/**
 * 백엔드 `ApiResponse<T>` envelope 에 대응한다 (앱 미러).
 *
 * 참조: api/crimp-common/src/main/java/io/crimp/common/response/ApiResponse.java
 */

export const ErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).nullable().optional(),
});

export type ErrorBody = z.infer<typeof ErrorBodySchema>;

export const ApiSuccessEnvelopeSchema = z.object({
  status: z.literal(true),
  data: z.unknown(),
});

export const ApiFailureEnvelopeSchema = z.object({
  status: z.literal(false),
  error: ErrorBodySchema,
});

export const ApiEnvelopeSchema = z.discriminatedUnion('status', [
  ApiSuccessEnvelopeSchema,
  ApiFailureEnvelopeSchema,
]);

export type ApiEnvelope = z.infer<typeof ApiEnvelopeSchema>;
