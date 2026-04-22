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
  levelSelf: z.number().int().min(0).max(127).nullable(),
  mainGymId: z.number().nullable(),
  avatarMediaId: z.number().nullable(),
});

export type Me = z.infer<typeof MeSchema>;
