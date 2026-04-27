import { z } from 'zod';

import { AttemptResultSchema } from './attempt';

/**
 * 피드 (Feed) 관련 zod 스키마.
 *
 * 참조:
 * - api/crimp-api/src/main/java/io/crimp/api/feed/FeedController.java
 * - api/crimp-api/src/main/java/io/crimp/api/feed/dto/FeedItemResponse.java
 * - api/crimp-api/src/main/java/io/crimp/api/feed/dto/FeedListResponse.java
 *
 * 백엔드 `BigDecimal` (gradeNumeric) · `long` (likes/comments) 은 JSON number 로 직렬화되므로
 * `z.number()` 로 받는다 (정밀도 유실 위험은 현재 V-스케일 / 카운트 범위에서는 안전).
 *
 * `gymName` / `gradeValue` / `gradeNumeric` / `holdColor` / `note` 는 백엔드 계약상 nullable.
 */

/** 피드 필터 모드 — 백엔드 `FeedFilter` enum 과 동기. */
export const FeedFilterSchema = z.enum(['popular', 'my-gym', 'friends']);

export type FeedFilter = z.infer<typeof FeedFilterSchema>;

export const FEED_FILTERS: readonly FeedFilter[] = [
  'friends',
  'popular',
  'my-gym',
] as const;

/** 피드 한 아이템 — 백엔드 `FeedItemResponse` 와 동기. */
export const FeedItemSchema = z.object({
  /** 시도 extId (ULID) — list key 및 상세 라우팅 안정 키. */
  extId: z.string(),
  /** 작성자 extId (ULID) — 프로필 라우팅용. */
  userExtId: z.string(),
  userNickname: z.string(),
  /**
   * 아바타 색상 결정용 hue (0~359). 백엔드가 사용자 ID 기반으로 결정성 있게 산출.
   * UI 는 `oklch(82% 0.06 <hue>)` 로 그대로 렌더.
   */
  avatarColorHue: z.number().int(),
  gymName: z.string().nullable(),
  result: AttemptResultSchema,
  gradeValue: z.string().nullable(),
  gradeNumeric: z.number().nullable(),
  holdColor: z.string().nullable(),
  note: z.string().nullable(),
  // long → JSON number. 음수가 올 일은 없지만 계약 범위 보존.
  likes: z.number().int(),
  comments: z.number().int(),
  loggedAt: z.string(),
});

export type FeedItem = z.infer<typeof FeedItemSchema>;

/** 페이지 메타 — `SessionPage` 와 동일 형태. */
export const FeedPageMetaSchema = z.object({
  nextCursor: z.number().nullable(),
  size: z.number().int(),
});

export type FeedPageMeta = z.infer<typeof FeedPageMetaSchema>;

/** `GET /api/v1/feed` 응답 `data` 필드 (envelope 내부 payload). */
export const FeedListSchema = z.object({
  items: z.array(FeedItemSchema),
  page: FeedPageMetaSchema,
});

export type FeedList = z.infer<typeof FeedListSchema>;
