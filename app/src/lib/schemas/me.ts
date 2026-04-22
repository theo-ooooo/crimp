import { z } from 'zod';

/**
 * `GET /api/v1/me` 응답 스키마.
 *
 * 참조: api/crimp-api/src/main/java/io/crimp/api/user/UserController.java
 */
export const MeSchema = z.object({
  extId: z.string(),
  nickname: z.string().nullable(),
  bio: z.string().nullable(),
  // 백엔드 Byte 계약 범위 (-128~127). 음수는 비즈니스상 기대치 아님 — 표시 시 UI clamp.
  levelSelf: z.number().int().min(-128).max(127).nullable(),
  mainGymId: z.number().nullable(),
  avatarMediaId: z.number().nullable(),
});

export type Me = z.infer<typeof MeSchema>;
