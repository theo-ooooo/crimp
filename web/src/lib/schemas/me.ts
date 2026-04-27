import { z } from 'zod';

/**
 * `GET /api/v1/me` 응답 스키마.
 *
 * 참조: api/crimp-api/src/main/java/io/crimp/api/user/UserController.java
 * `MeResponse(extId, nickname, bio, levelSelf, mainGymId, mainGym, avatarMediaId)`.
 *
 * 백엔드에서 nullable 로 직렬화되는 필드는 zod 에서도 `.nullable()` 로 표기.
 */

/**
 * 백엔드 `MainGymResponse` — 클라이언트 렌더용 최소 암장 정보.
 *
 * 전역 `@JsonInclude(NON_NULL)` 정책 → mainGym 자체가 null 이거나
 * brand 가 null 이면 응답에서 키가 누락된다. 따라서 `brand` 는
 * `nullable + optional`. mainGymId 가 null 이거나 해당 암장이 더 이상
 * ACTIVE 가 아니면 `mainGym` 객체 자체가 null/누락.
 */
export const MainGymRefSchema = z.object({
  // ULID 문자열 — PATCH 시 `mainGymExtId` 로 그대로 전달.
  extId: z.string(),
  name: z.string(),
  brand: z.string().nullable().optional(),
});

export type MainGymRef = z.infer<typeof MainGymRefSchema>;

export const MeSchema = z.object({
  extId: z.string(),
  nickname: z.string().nullable(),
  bio: z.string().nullable(),
  // 백엔드 Byte 계약 범위 (-128~127). 비즈니스상 음수는 나오지 않지만,
  // 백엔드가 실수로 음수를 반환해도 /me 화면이 깨지지 않도록 계약 범위 전체를 허용.
  // 사용자 표시 시에는 UI 단에서 `Math.max(0, value)` 등으로 clamp.
  levelSelf: z.number().int().min(-128).max(127).nullable(),
  // 백엔드 Long → JSON number. 호환용 — UI 는 `mainGym` 객체를 우선 사용.
  mainGymId: z.number().nullable(),
  // 해석된 mainGym 객체. null 또는 NON_NULL 정책으로 키 누락 가능.
  mainGym: MainGymRefSchema.nullable().optional(),
  avatarMediaId: z.number().nullable(),
});

export type Me = z.infer<typeof MeSchema>;
