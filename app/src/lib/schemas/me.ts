import { z } from 'zod';

/**
 * `GET /api/v1/me` 응답 스키마.
 *
 * 참조: api/crimp-api/src/main/java/io/crimp/api/user/UserController.java
 *
 * 백엔드는 Jackson `@JsonInclude(NON_NULL)` 직렬화로 nullable 필드의 키 자체가 누락될 수
 * 있으므로 `nullable().optional()` 로 둘 다 허용한다.
 */
export const MeSchema = z.object({
  extId: z.string(),
  nickname: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  // 백엔드 Byte 계약 범위 (-128~127). 음수는 비즈니스상 기대치 아님 — 표시 시 UI clamp.
  levelSelf: z.number().int().min(-128).max(127).nullable().optional(),
  mainGymId: z.number().nullable().optional(),
  avatarMediaId: z.number().nullable().optional(),
});

export type Me = z.infer<typeof MeSchema>;

/**
 * `PATCH /api/v1/me/profile` 요청 본문.
 *
 * 모든 필드 선택. 백엔드 `UpdateProfileRequest` 와 1:1 매칭:
 * - `nickname`     : 2~30자 (백엔드 `@Size(min=2,max=30)`).
 * - `bio`          : 0~300자 (백엔드 `@Size(max=300)`).
 * - `levelSelf`    : Byte 범위. UI 에서 V0~V10 등으로 매핑되더라도 와이어는 정수.
 * - `mainGymId`    : 내부 PK (Long). null 로 보내면 해제.
 * - `avatarMediaId`: 미디어 PK. 본 PR 에서는 사용하지 않지만 계약 보존.
 *
 * 클라에서 zod 로 길이를 강제해 의미 없는 왕복을 줄인다. 본 PR 은 mainGymId 만 사용.
 */
export const UpdateProfileBodySchema = z
  .object({
    nickname: z.string().min(2).max(30).optional(),
    bio: z.string().max(300).optional(),
    levelSelf: z.number().int().min(-128).max(127).nullable().optional(),
    mainGymId: z.number().int().nullable().optional(),
    avatarMediaId: z.number().int().nullable().optional(),
  })
  .strict();

export type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;
