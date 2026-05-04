import { z } from 'zod';

/**
 * Gym / Route 관련 zod 스키마 (앱).
 *
 * 참조:
 * - api/crimp-api/src/main/java/io/crimp/api/gym/GymController.java
 * - api/crimp-domain/src/main/java/io/crimp/domain/gym/GymView.java
 * - api/crimp-domain/src/main/java/io/crimp/domain/gym/RouteView.java
 *
 * BigDecimal 직렬화:
 *   Jackson 기본 설정에서 BigDecimal 은 JSON number 리터럴로 내려온다. 기존
 *   `attempt.ts` 의 `gradeNumeric` 과 같이 `z.number()` 로 받아 통일한다. 위·경도의
 *   소수점 정밀도는 `double` 범위 내에서 안전 (지도 표시 해상도로 충분).
 *
 *   백엔드가 `spring.jackson.serialization.write-bigdecimal-as-plain=true` 같은 설정으로
 *   문자열 직렬화로 전환하게 되면, 그 시점에 pair 화면 (web) 과 함께 스키마를
 *   `z.union([z.string(), z.number()])` 로 동시 수정한다.
 */

export const GymPageSchema = z.object({
  nextCursor: z.number().nullable(),
  size: z.number().int(),
});

export type GymPage = z.infer<typeof GymPageSchema>;

// ===== Gym 목록 아이템 =====

export const GymItemSchema = z.object({
  extId: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  address: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  rating: z.number().nullable(),
  sendCount: z.number(),
  monthlyUserCount: z.number(),
  // [PR-G1] 검색이 lat/lng query param 으로 호출됐을 때만 채워짐 (m). 미사용 시 null.
  distanceMeters: z.number().nullable(),
});

export type GymItem = z.infer<typeof GymItemSchema>;

export const GymListSchema = z.object({
  items: z.array(GymItemSchema),
  page: GymPageSchema,
});

export type GymList = z.infer<typeof GymListSchema>;

// ===== Gym 상세 =====

export const GymDetailSchema = z.object({
  extId: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  address: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  phone: z.string().nullable(),
  openingHoursJson: z.string().nullable(),
  settingCycleDays: z.number().int().nullable(),
  featuresJson: z.string().nullable(),
  rating: z.number().nullable(),
  sendCount: z.number(),
  monthlyUserCount: z.number(),
});

export type GymDetail = z.infer<typeof GymDetailSchema>;

// ===== Route (활성 루트 목록) =====

export const RouteItemSchema = z.object({
  extId: z.string(),
  name: z.string().nullable(),
  color: z.string().nullable(),
  gradeScale: z.string().nullable(),
  gradeValue: z.string().nullable(),
  gradeNumeric: z.number().nullable(),
  setter: z.string().nullable(),
  // LocalDate → ISO-8601 "YYYY-MM-DD" 문자열.
  setAt: z.string().nullable(),
});

export type RouteItem = z.infer<typeof RouteItemSchema>;

export const RouteListSchema = z.object({
  items: z.array(RouteItemSchema),
  page: GymPageSchema,
});

export type RouteList = z.infer<typeof RouteListSchema>;
