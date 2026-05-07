import { z } from 'zod';

/**
 * 미디어 업로드 (presign → PUT → complete) 응답 스키마 (PR #92, F5 PR-3).
 * 백엔드 PR #90 의 `MediaController.PresignResponse` / `CompleteResponse` 와 1:1 대응.
 */

export const MediaKindSchema = z.enum(['IMAGE', 'VIDEO']);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const MediaUsageSchema = z.enum(['ATTEMPT', 'AVATAR', 'POSTER']);
export type MediaUsage = z.infer<typeof MediaUsageSchema>;

export const PresignResponseSchema = z.object({
  id: z.number().int(),
  extId: z.string(),
  uploadUrl: z.string().url(),
  /** @deprecated originalPath 와 동일한 호환 필드 */
  s3Key: z.string(),
  originalPath: z.string().optional(),
  expiresAt: z.string(), // ISO Instant
  mime: z.string(),
  usage: MediaUsageSchema.optional(),
});
export type PresignResponse = z.infer<typeof PresignResponseSchema>;

export const CompleteResponseSchema = z.object({
  id: z.number().int(),
  extId: z.string(),
  kind: z.string(), // 백엔드가 enum.name() 으로 보내므로 문자열로 받음
  status: z.string(),
  usage: z.string().optional(),
  mime: z.string(),
  byteSize: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  durationMs: z.number().nullable(),
  /** @deprecated originalPath 와 동일한 호환 필드 */
  s3Key: z.string(),
  originalPath: z.string().optional(),
  variantPath: z.string().nullable().optional(),
  originalUrl: z.string().nullable().optional(),
  variantUrl: z.string().nullable().optional(),
  cdnUrl: z.string().nullable(),
  thumbnailCdnUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type CompleteResponse = z.infer<typeof CompleteResponseSchema>;
