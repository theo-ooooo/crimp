import { z } from 'zod';

import { AttemptResultSchema } from './attempt';

/**
 * Feed(피드) 관련 zod 스키마 (앱).
 *
 * 참조:
 * - api/crimp-api/src/main/java/io/crimp/api/feed/FeedController.java
 * - api/crimp-api/src/main/java/io/crimp/api/feed/dto/FeedItemResponse.java
 * - api/crimp-api/src/main/java/io/crimp/api/feed/dto/FeedListResponse.java
 *
 * 백엔드는 Jackson `@JsonInclude(NON_NULL)` 직렬화로 nullable 필드(gymName,
 * gradeValue, gradeNumeric, holdColor, note)가 null 일 경우 키 자체를 누락한다.
 * 따라서 zod 측에서 `nullable().optional()` 로 받아 둘 다 허용한다.
 */

/** 피드 필터 — 백엔드 query string 표현과 1:1 매칭. */
export const FeedFilterSchema = z.enum(['popular', 'friends', 'my-gym']);
export type FeedFilter = z.infer<typeof FeedFilterSchema>;

/** UI 에서 사용할 필터 순서·기본값 — 모크는 "친구" 가 active 여서 default 도 friends 로 둔다. */
export const FEED_FILTERS: readonly FeedFilter[] = [
  'friends',
  'popular',
  'my-gym',
] as const;

export const DEFAULT_FEED_FILTER: FeedFilter = 'friends';

/**
 * 피드 단일 아이템.
 *
 * - `extId`     : SessionAttempt 의 ULID (영구 식별자, FlatList key)
 * - `userExtId` : 작성자 ULID
 * - `avatarColorHue` : 백엔드가 결정성 매핑(`(userId*70+180)%360`)으로 내려주는 0~359
 *   값. 모크는 i*70+180 였지만 실제로는 작성자 단위 결정성을 보장하기 위해 서버 값
 *   사용. RN StyleSheet 가 oklch 를 못 받으므로 화면 단에서 HSL 로 변환한다.
 * - `holdColor` : `HoldDot` 의 `color` prop 으로 그대로 전달 가능한 키.
 *   (theme.hold 에 등록된 키일 때만 유의미; 외 값은 raw color 로 fallback.)
 * - `note`      : 최대 300자 (등록 시 제약). 표시는 줄바꿈 보존, lineHeight 1.5.
 */
export const FeedItemSchema = z.object({
  extId: z.string(),
  userExtId: z.string(),
  userNickname: z.string(),
  avatarColorHue: z.number().int().min(0).max(359),
  gymName: z.string().nullable().optional(),
  result: AttemptResultSchema,
  gradeValue: z.string().nullable().optional(),
  gradeNumeric: z.number().nullable().optional(),
  holdColor: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  likes: z.number().int().min(0),
  comments: z.number().int().min(0),
  // 좋아요/댓글 도메인(PR #56) 도입 후 백엔드가 내려주는 본인 좋아요 여부.
  // NON_NULL 직렬화 대상이 아닌 primitive `boolean` 이라 항상 직렬화된다.
  liked: z.boolean(),
  // Instant ISO-8601 문자열로 수신.
  loggedAt: z.string(),
  // (PR-F2) 미디어 — seq 순서. cdnUrl 이 null 인 항목은 백엔드가 제외하므로 안전한 url 만.
  // (PR-F2) 백엔드는 항상 배열 (없으면 빈 배열) — `.default([])` 사용 시 zod 의 input 타입이
  // optional 로 잡혀 consumer 측 TS 오류가 회귀해, default 없이 required 로 둔다.
  mediaUrls: z.array(
    z.object({
      kind: z.enum(['IMAGE', 'VIDEO']),
      url: z.string().url(),
      thumbnailUrl: z.string().url().nullable().optional(),
    }),
  ),
});

export type FeedItem = z.infer<typeof FeedItemSchema>;

export const FeedPageSchema = z.object({
  nextCursor: z.number().nullable(),
  size: z.number().int(),
});

export type FeedPage = z.infer<typeof FeedPageSchema>;

export const FeedListSchema = z.object({
  items: z.array(FeedItemSchema),
  page: FeedPageSchema,
});

export type FeedList = z.infer<typeof FeedListSchema>;

// ===== 좋아요 / 댓글 (PR #56 social 도메인) =====

/**
 * `POST/DELETE /api/v1/feed-posts/{extId}/like` 응답.
 *
 * - `liked`     : 토글 후 현재 본인의 좋아요 상태
 * - `likeCount` : 토글 후 게시글 총 좋아요 수 (백엔드는 long, JSON 에서는 number)
 */
export const LikeToggleResponseSchema = z.object({
  liked: z.boolean(),
  likeCount: z.number().int().min(0),
});

export type LikeToggleResponse = z.infer<typeof LikeToggleResponseSchema>;

/**
 * 댓글 단건.
 *
 * - `parentExtId` : 일반 댓글이면 null. 대댓글이면 부모 ext_id.
 * - `userNickname`: 회원 탈퇴/숨김 등으로 백엔드가 null 을 내려줄 수 있어 nullable.
 *   (`@JsonInclude(NON_NULL)` 직렬화로 키 자체가 누락될 수도 있다.)
 * - `avatarColorHue` : Feed 와 동일한 결정성 hue (0..359).
 */
export const CommentSchema = z.object({
  extId: z.string(),
  userExtId: z.string(),
  userNickname: z.string().nullable().optional(),
  avatarColorHue: z.number().int().min(0).max(359),
  content: z.string(),
  createdAt: z.string(),
  parentExtId: z.string().nullable().optional(),
});

export type Comment = z.infer<typeof CommentSchema>;

/** `GET /api/v1/feed-posts/{extId}/comments` 응답. */
export const CommentListSchema = z.object({
  items: z.array(CommentSchema),
  page: FeedPageSchema,
});

export type CommentList = z.infer<typeof CommentListSchema>;

/**
 * `POST /api/v1/feed-posts/{extId}/comments` 요청 본문.
 *
 * 백엔드 제약(`@NotBlank @Size(max=1000)`) 과 동일한 길이 제한을 클라에서도 검증해
 * 의미 없는 네트워크 왕복을 줄인다.
 */
export const CreateCommentBodySchema = z.object({
  content: z.string().min(1).max(1000),
  parentExtId: z.string().nullable().optional(),
});

export type CreateCommentBody = z.infer<typeof CreateCommentBodySchema>;
