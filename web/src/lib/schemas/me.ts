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
  // 백엔드 Byte 계약 범위 (-128~127). 비즈니스상 음수는 나오지 않지만,
  // 백엔드가 실수로 음수를 반환해도 /me 화면이 깨지지 않도록 계약 범위 전체를 허용.
  // 사용자 표시 시에는 UI 단에서 `Math.max(0, value)` 등으로 clamp.
  levelSelf: z.number().int().min(-128).max(127).nullable(),
  // 백엔드 Long → JSON number (내부 PK; 클라이언트는 표시용으로만 사용)
  mainGymId: z.number().nullable(),
  avatarMediaId: z.number().nullable(),
});

export type Me = z.infer<typeof MeSchema>;
