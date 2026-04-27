import { z } from 'zod';

/**
 * Gym(암장) / Route(루트) 관련 zod 스키마.
 *
 * 참조:
 * - api/crimp-api/src/main/java/io/crimp/api/gym/GymController.java
 *   (`GymListResponse`, `GymDetailResponse`, `RouteListResponse`, `Page`)
 *
 * BigDecimal 직렬화:
 * - 프로젝트의 다른 엔드포인트(`AttemptResponse.gradeNumeric`)는 `z.number()` 로 받지만,
 *   Jackson 설정에 따라 문자열로 올 가능성도 있으므로 안전하게 `z.union([z.string(), z.number()])`
 *   로 받는다. (`apiRequest` 의 `ZodType<T>` 제약상 transform 으로 Input/Output 을 달리 두면
 *   타입 추론이 깨지므로, union 자체를 출력 타입으로 유지하고 화면에서 `String(v)` 로 정규화.)
 *
 * nullable 직렬화 필드:
 * - 백엔드 `@JsonInclude(NON_NULL)` 설정으로 null 필드는 JSON 에서 누락될 수 있다.
 *   따라서 nullable + optional 을 함께 적용.
 */

/** BigDecimal 직렬화 대응. null / 미포함 모두 허용. */
const BigDecimalLikeNullable = z
  .union([z.string(), z.number()])
  .nullable()
  .optional();

/** 백엔드 `GymListResponse.GymItem`. 목록 카드에서 사용.
 *
 * `id` 는 내부 PK (numeric Long) — 현재 백엔드 GymItem 에는 미노출이지만,
 * `Profile.mainGymId` 는 numeric id 만 받기 때문에 향후 GymItem 응답에 id 가
 * 추가될 경우를 대비해 선택 필드로 미리 받아둔다. (없으면 undefined.)
 *
 * @see web/src/components/me/MainGymPickerDialog.tsx — id 부재 시 선택 불가 처리.
 */
export const GymItemSchema = z.object({
  id: z.number().optional(),
  extId: z.string(),
  name: z.string(),
  brand: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  lat: BigDecimalLikeNullable,
  lng: BigDecimalLikeNullable,
});

export type GymItem = z.infer<typeof GymItemSchema>;

/** 공통 커서 페이지. 세션 목록과 구조 동일하지만 이름 충돌 방지 차원에서 별도 선언. */
export const GymPageSchema = z.object({
  nextCursor: z.number().nullable(),
  size: z.number().int(),
});

export type GymPage = z.infer<typeof GymPageSchema>;

/** `GET /api/v1/gyms` 응답 `data` 필드. */
export const GymListSchema = z.object({
  items: z.array(GymItemSchema),
  page: GymPageSchema,
});

export type GymList = z.infer<typeof GymListSchema>;

/** 백엔드 `GymDetailResponse`. 상세 페이지에서 사용. */
export const GymDetailSchema = z.object({
  extId: z.string(),
  name: z.string(),
  brand: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  lat: BigDecimalLikeNullable,
  lng: BigDecimalLikeNullable,
  phone: z.string().nullable().optional(),
  openingHoursJson: z.string().nullable().optional(),
  settingCycleDays: z.number().int().nullable().optional(),
  featuresJson: z.string().nullable().optional(),
});

export type GymDetail = z.infer<typeof GymDetailSchema>;

/** 백엔드 `RouteListResponse.RouteItem`. */
export const RouteItemSchema = z.object({
  extId: z.string(),
  name: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  gradeScale: z.string(),
  gradeValue: z.string().nullable().optional(),
  gradeNumeric: BigDecimalLikeNullable,
  setter: z.string().nullable().optional(),
  // `LocalDate` → `yyyy-MM-dd` 문자열. 파싱은 화면측에서 `new Date(setAt)` 로.
  setAt: z.string().nullable().optional(),
});

export type RouteItem = z.infer<typeof RouteItemSchema>;

/** `GET /api/v1/gyms/{extId}/routes` 응답 `data` 필드. */
export const RouteListSchema = z.object({
  items: z.array(RouteItemSchema),
  page: GymPageSchema,
});

export type RouteList = z.infer<typeof RouteListSchema>;
