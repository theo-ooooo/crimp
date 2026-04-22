import { z } from 'zod';

/**
 * `GET /api/v1/me` 응답 스키마.
 *
 * 참조: api/crimp-api/src/main/java/io/crimp/api/user/UserController.java
 * `MeResponse(extId, nickname, bio, levelSelf, mainGymId, avatarMediaId)`.
 *
 * 백엔드에서 nullable 로 직렬화되는 필드는 zod 에서도 `.nullable()` 로 표기.
 */
export const MeSchema = z.object({
  extId: z.string(),
  nickname: z.string().nullable(),
  bio: z.string().nullable(),
  // 백엔드 Byte → JSON number (0~127)
  levelSelf: z.number().int().min(0).max(127).nullable(),
  // 백엔드 Long → JSON number (내부 PK; 클라이언트는 표시용으로만 사용)
  mainGymId: z.number().nullable(),
  avatarMediaId: z.number().nullable(),
});

export type Me = z.infer<typeof MeSchema>;
