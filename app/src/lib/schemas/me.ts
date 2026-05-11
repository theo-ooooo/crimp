import { z } from 'zod';

/**
 * `GET /api/v1/me` 응답 스키마.
 *
 * 참조: api/crimp-api/src/main/java/io/crimp/api/user/UserController.java
 *
 * 백엔드는 Jackson `@JsonInclude(NON_NULL)` 직렬화로 nullable 필드의 키 자체가 누락될 수
 * 있으므로 `nullable().optional()` 로 둘 다 허용한다.
 *
 * `mainGym` (PR #59): 현재 설정된 주 암장의 해석 결과 — extId/name/brand 의 최소 표현.
 * 미설정이거나 해당 암장이 ACTIVE 가 아니면 키 자체가 누락된다 (NON_NULL 정책). brand 도
 * nullable: 브랜드 미등록 암장은 brand 키가 누락된 형태로 내려온다.
 */
export const MainGymViewSchema = z.object({
  extId: z.string(),
  name: z.string(),
  brand: z.string().nullable().optional(),
});

export type MainGymView = z.infer<typeof MainGymViewSchema>;

const MeWireSchema = z.object({
  extId: z.string(),
  nickname: z.string().nullable().optional(),
  nicknameConfigured: z.boolean().optional(),
  bio: z.string().nullable().optional(),
  // 백엔드 Byte 계약 범위 (-128~127). 음수는 비즈니스상 기대치 아님 — 표시 시 UI clamp.
  levelSelf: z.number().int().min(-128).max(127).nullable().optional(),
  // 내부 PK. 호환을 위해 응답에 그대로 노출되지만, 클라는 mainGym(extId 기반) 을 우선 사용한다.
  mainGymId: z.number().nullable().optional(),
  mainGym: MainGymViewSchema.nullable().optional(),
  avatarMediaId: z.number().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const MeSchema = MeWireSchema.transform((value) => ({
  ...value,
  nicknameConfigured: value.nicknameConfigured ?? false,
}));

export type Me = z.infer<typeof MeSchema>;

/**
 * `PATCH /api/v1/me/profile` 요청 본문.
 *
 * 모든 필드 선택. 백엔드 `UpdateProfileRequest` 와 1:1 매칭:
 * - `nickname`        : 2~30자 (백엔드 `@Size(min=2,max=30)`).
 * - `bio`             : 0~300자 (백엔드 `@Size(max=300)`).
 * - `levelSelf`       : Byte 범위. UI 에서 V0~V10 등으로 매핑되더라도 와이어는 정수.
 * - `mainGymExtId`    : ULID 26자. 주 암장 변경의 권장 경로 (PR #59).
 * - `clearMainGym`    : true 면 주 암장 해제. mainGymExtId/mainGymId 와 동시 set 은 백엔드가
 *                       `INVALID_MAIN_GYM_REQUEST` (400) 로 거부.
 * - `mainGymId`       : 내부 PK 호환 경로. 신규 클라는 사용하지 않는다.
 * - `avatarMediaId`   : 미디어 PK. 서버가 본인 소유 READY IMAGE 인지 검증.
 * - `clearAvatar`     : true 면 프로필 이미지 해제. avatarMediaId 와 동시 설정 불가.
 *
 * 클라에서 zod 로 길이를 강제해 의미 없는 왕복을 줄인다.
 */
export const UpdateProfileBodySchema = z
  .object({
    nickname: z.string().min(2).max(30).optional(),
    bio: z.string().max(300).optional(),
    levelSelf: z.number().int().min(-128).max(127).nullable().optional(),
    mainGymId: z.number().int().nullable().optional(),
    mainGymExtId: z.string().length(26).optional(),
    clearMainGym: z.boolean().optional(),
    clearAvatar: z.boolean().optional(),
    avatarMediaId: z.number().int().nullable().optional(),
  })
  .strict()
  .refine(
    (b) =>
      !(
        b.clearMainGym === true &&
        (b.mainGymExtId !== undefined || b.mainGymId !== undefined)
      ),
    {
      message:
        'clearMainGym 과 mainGymExtId/mainGymId 는 동시에 설정할 수 없습니다.',
      path: ['clearMainGym'],
    },
  )
  .refine(
    (b) =>
      !(
        b.clearAvatar === true &&
        b.avatarMediaId !== undefined &&
        b.avatarMediaId !== null
      ),
    {
      message: 'clearAvatar 과 avatarMediaId 는 동시에 설정할 수 없습니다.',
      path: ['clearAvatar'],
    },
  );

export type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;
