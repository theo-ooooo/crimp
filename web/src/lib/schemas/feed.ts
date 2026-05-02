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
  /** 피드 포스트 extId (ULID) — list key 및 좋아요/댓글 API 의 `{extId}` 경로. */
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
  /** 호출자(현재 사용자)가 이 포스트를 좋아요했는지. v2 (PR #56) 부터 추가. */
  liked: z.boolean(),
  loggedAt: z.string(),
  /**
   * (PR-F2) 피드 카드에 표시할 미디어. seq 순서로 정렬됨. CDN URL 이 없는 항목은
   * 백엔드 단계에서 제외되므로 응답에는 항상 사용 가능한 URL 만 포함.
   * 빈 배열 = 미디어 없음.
   */
  // (PR-F2) `.default([])` 사용 시 zod input 타입이 optional 로 잡혀 consumer 측 TS 오류가
  // 발생해 default 없이 required. 백엔드는 항상 배열 (없으면 빈 배열) 보장.
  mediaUrls: z.array(
    z.object({
      kind: z.enum(['IMAGE', 'VIDEO']),
      url: z.string().url(),
      thumbnailUrl: z.string().url().nullable(),
    }),
  ),
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

// ─────────────────────────────────────────────────────────────
// Like / Comment (PR #56 — `SocialController`)
// ─────────────────────────────────────────────────────────────

/**
 * `POST/DELETE /api/v1/feed-posts/{extId}/like` 응답.
 * 백엔드 `LikeToggleResponse(boolean liked, long likeCount)` 와 동기.
 */
export const LikeToggleResponseSchema = z.object({
  liked: z.boolean(),
  // long → JSON number. 카운터는 양의 정수.
  likeCount: z.number().int(),
});

export type LikeToggleResponse = z.infer<typeof LikeToggleResponseSchema>;

/**
 * 댓글 한 건 — 백엔드 `CommentResponse` 와 동기.
 *
 * `parentExtId` 는 대댓글이면 부모 댓글의 ext_id, 일반 댓글이면 null.
 * UI Phase 1.5 에서는 대댓글 트리 렌더는 미구현 — 평탄 리스트만 노출.
 */
export const CommentSchema = z.object({
  extId: z.string(),
  userExtId: z.string(),
  userNickname: z.string().nullable(),
  avatarColorHue: z.number().int(),
  content: z.string(),
  createdAt: z.string(),
  parentExtId: z.string().nullable(),
});

export type Comment = z.infer<typeof CommentSchema>;

/** 댓글 목록 — `CommentListResponse` 와 동기. */
export const CommentListSchema = z.object({
  items: z.array(CommentSchema),
  page: FeedPageMetaSchema,
});

export type CommentList = z.infer<typeof CommentListSchema>;

/**
 * `POST /api/v1/feed-posts/{extId}/comments` 본문.
 * 서버 검증: content 1..1000, parentExtId nullable.
 */
export const CreateCommentBodySchema = z.object({
  content: z.string().min(1).max(1000),
  parentExtId: z.string().nullable().optional(),
});

export type CreateCommentBody = z.infer<typeof CreateCommentBodySchema>;
