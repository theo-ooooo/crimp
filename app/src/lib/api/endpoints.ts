import { z } from 'zod';

import {
  AttemptListSchema,
  AttemptSchema,
  type Attempt,
  type AttemptList,
  type LogAttemptBody,
  type UpdateAttemptBody,
} from '@/lib/schemas/attempt';
import {
  TokenResponseSchema,
  type OauthProvider,
  type TokenResponse,
} from '@/lib/schemas/auth';
import {
  CommentListSchema,
  CommentSchema,
  FeedListSchema,
  LikeToggleResponseSchema,
  type Comment,
  type CommentList,
  type FeedFilter,
  type FeedList,
  type LikeToggleResponse,
} from '@/lib/schemas/feed';
import {
  GymDetailSchema,
  GymListSchema,
  RouteListSchema,
  type GymDetail,
  type GymList,
  type RouteList,
} from '@/lib/schemas/gym';
import { HealthResponseSchema, type HealthResponse } from '@/lib/schemas/health';
import {
  CompleteResponseSchema,
  PresignResponseSchema,
  type CompleteResponse,
  type MediaKind,
  type PresignResponse,
} from '@/lib/schemas/media';
import { MeSchema, type Me, type UpdateProfileBody } from '@/lib/schemas/me';
import { MeStatsSchema, type MeStats } from '@/lib/schemas/meStats';
import {
  SessionListSchema,
  SessionSchema,
  type Session,
  type SessionList,
  type StartSessionBody,
  type UpdateSessionBody,
} from '@/lib/schemas/session';

import { apiRequest } from './client';

// ===== Auth =====

/**
 * `POST /api/v1/auth/oauth/{provider}` — provider 가 발급한 idToken 을 백엔드에 제출하고
 * Crimp JWT (access/refresh) 쌍을 받는다.
 *
 * provider 는 백엔드 `OauthProvider` enum 의 lower-case 표현 (`kakao`, `apple`, `google`).
 */
export function exchangeOauth(
  provider: OauthProvider,
  idToken: string,
  signal?: AbortSignal,
): Promise<TokenResponse> {
  return apiRequest({
    method: 'POST',
    path: `/api/v1/auth/oauth/${provider}`,
    body: { idToken },
    schema: TokenResponseSchema,
    signal,
  });
}

/** `POST /api/v1/auth/refresh` — refresh 토큰으로 토큰 쌍을 재발급. */
export function refreshTokens(
  refreshToken: string,
  signal?: AbortSignal,
): Promise<TokenResponse> {
  return apiRequest({
    method: 'POST',
    path: '/api/v1/auth/refresh',
    body: { refreshToken },
    schema: TokenResponseSchema,
    signal,
  });
}

/** `POST /api/v1/auth/logout` — refresh 토큰을 블랙리스트 처리. 204 응답. */
export function logout(
  refreshToken: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequest({
    method: 'POST',
    path: '/api/v1/auth/logout',
    body: { refreshToken },
    schema: z.void(),
    signal,
  });
}

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest({
    method: 'GET',
    path: '/api/v1/health',
    schema: HealthResponseSchema,
    signal,
  });
}

export function fetchMe(accessToken: string, signal?: AbortSignal): Promise<Me> {
  return apiRequest({
    method: 'GET',
    path: '/api/v1/me',
    accessToken,
    schema: MeSchema,
    signal,
  });
}

/**
 * `PATCH /api/v1/me/profile` — 내 프로필 부분 수정.
 *
 * 모든 필드 선택. 주 암장 변경은 PR #59 contract 를 따른다:
 * - `mainGymExtId` (ULID 26자) — 권장 경로.
 * - `clearMainGym: true` — 명시 해제 (mainGymExtId/mainGymId 와 동시 설정 시 400).
 * - `mainGymId` (Long) — 호환 경로.
 *
 * 응답은 갱신된 `MeResponse` (= `Me` 스키마와 동일).
 */
export function updateMyProfile(
  accessToken: string,
  body: UpdateProfileBody,
  signal?: AbortSignal,
): Promise<Me> {
  return apiRequest({
    method: 'PATCH',
    path: '/api/v1/me/profile',
    accessToken,
    body,
    schema: MeSchema,
    signal,
  });
}

export function fetchMeStats(
  accessToken: string,
  signal?: AbortSignal,
): Promise<MeStats> {
  return apiRequest({
    method: 'GET',
    path: '/api/v1/me/stats',
    accessToken,
    schema: MeStatsSchema,
    signal,
  });
}

// ===== Sessions =====

/**
 * `GET /api/v1/me/sessions` — 내 세션 목록 (커서 기반).
 */
export function fetchMySessions(
  accessToken: string,
  cursor?: number | null,
  size?: number,
  signal?: AbortSignal,
): Promise<SessionList> {
  const params = new URLSearchParams();
  if (cursor !== undefined && cursor !== null) {
    params.set('cursor', String(cursor));
  }
  if (size !== undefined) {
    params.set('size', String(size));
  }
  const qs = params.toString();
  return apiRequest({
    method: 'GET',
    path: `/api/v1/me/sessions${qs ? `?${qs}` : ''}`,
    accessToken,
    schema: SessionListSchema,
    signal,
  });
}

/** `POST /api/v1/sessions` — 세션 시작. */
export function startSession(
  accessToken: string,
  body: StartSessionBody,
  signal?: AbortSignal,
): Promise<Session> {
  return apiRequest({
    method: 'POST',
    path: '/api/v1/sessions',
    accessToken,
    body,
    schema: SessionSchema,
    signal,
  });
}

/** `GET /api/v1/sessions/{extId}` — 세션 단건. */
export function fetchSession(
  accessToken: string,
  extId: string,
  signal?: AbortSignal,
): Promise<Session> {
  return apiRequest({
    method: 'GET',
    path: `/api/v1/sessions/${encodeURIComponent(extId)}`,
    accessToken,
    schema: SessionSchema,
    signal,
  });
}

/** `PATCH /api/v1/sessions/{extId}`. */
export function updateSession(
  accessToken: string,
  extId: string,
  body: UpdateSessionBody,
  signal?: AbortSignal,
): Promise<Session> {
  return apiRequest({
    method: 'PATCH',
    path: `/api/v1/sessions/${encodeURIComponent(extId)}`,
    accessToken,
    body,
    schema: SessionSchema,
    signal,
  });
}

/** `DELETE /api/v1/sessions/{extId}` — 204. */
export function deleteSession(
  accessToken: string,
  extId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequest({
    method: 'DELETE',
    path: `/api/v1/sessions/${encodeURIComponent(extId)}`,
    accessToken,
    schema: z.void(),
    signal,
  });
}

// ===== Attempts =====

/** `GET /api/v1/sessions/{sessionExtId}/attempts`. */
export function listAttempts(
  accessToken: string,
  sessionExtId: string,
  signal?: AbortSignal,
): Promise<AttemptList> {
  return apiRequest({
    method: 'GET',
    path: `/api/v1/sessions/${encodeURIComponent(sessionExtId)}/attempts`,
    accessToken,
    schema: AttemptListSchema,
    signal,
  });
}

/** `POST /api/v1/sessions/{sessionExtId}/attempts`. */
export function logAttempt(
  accessToken: string,
  sessionExtId: string,
  body: LogAttemptBody,
  signal?: AbortSignal,
): Promise<Attempt> {
  return apiRequest({
    method: 'POST',
    path: `/api/v1/sessions/${encodeURIComponent(sessionExtId)}/attempts`,
    accessToken,
    body,
    schema: AttemptSchema,
    signal,
  });
}

/** `PATCH /api/v1/attempts/{extId}`. */
export function updateAttempt(
  accessToken: string,
  extId: string,
  body: UpdateAttemptBody,
  signal?: AbortSignal,
): Promise<Attempt> {
  return apiRequest({
    method: 'PATCH',
    path: `/api/v1/attempts/${encodeURIComponent(extId)}`,
    accessToken,
    body,
    schema: AttemptSchema,
    signal,
  });
}

/** `DELETE /api/v1/attempts/{extId}` — 204. */
export function deleteAttempt(
  accessToken: string,
  extId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequest({
    method: 'DELETE',
    path: `/api/v1/attempts/${encodeURIComponent(extId)}`,
    accessToken,
    schema: z.void(),
    signal,
  });
}

// ===== Gyms =====

/**
 * `GET /api/v1/gyms` — 암장 검색·목록 (커서 기반).
 *
 * 비인증 엔드포인트. `q` / `brand` 는 부분 일치 / 정확 일치 조합 (백엔드 스펙 참조).
 */
export function fetchGyms(
  cursor?: number | null,
  q?: string,
  brand?: string,
  size?: number,
  signal?: AbortSignal,
): Promise<GymList> {
  const params = new URLSearchParams();
  if (cursor !== undefined && cursor !== null) {
    params.set('cursor', String(cursor));
  }
  if (q !== undefined && q.length > 0) {
    params.set('q', q);
  }
  if (brand !== undefined && brand.length > 0) {
    params.set('brand', brand);
  }
  if (size !== undefined) {
    params.set('size', String(size));
  }
  const qs = params.toString();
  return apiRequest({
    method: 'GET',
    path: `/api/v1/gyms${qs ? `?${qs}` : ''}`,
    schema: GymListSchema,
    signal,
  });
}

// ===== Feed =====

/**
 * `GET /api/v1/feed?filter=popular|friends|my-gym&cursor=...&size=...` — 피드 목록.
 *
 * - 인증 필수 (백엔드 SecurityConfig 의 anyRequest().authenticated 적용).
 * - filter 미전달 시 백엔드 기본값 `popular`. 우리는 명시적으로 항상 보내 호출 의도 명확화.
 * - cursor 는 이전 페이지 마지막 attempt.id (Long).
 */
export function fetchFeed(
  accessToken: string,
  filter: FeedFilter,
  cursor?: number | null,
  size?: number,
  signal?: AbortSignal,
): Promise<FeedList> {
  const params = new URLSearchParams();
  params.set('filter', filter);
  if (cursor !== undefined && cursor !== null) {
    params.set('cursor', String(cursor));
  }
  if (size !== undefined) {
    params.set('size', String(size));
  }
  return apiRequest({
    method: 'GET',
    path: `/api/v1/feed?${params.toString()}`,
    accessToken,
    schema: FeedListSchema,
    signal,
  });
}

/** `GET /api/v1/gyms/{extId}` — 암장 상세 (비인증). */
export function fetchGym(
  extId: string,
  signal?: AbortSignal,
): Promise<GymDetail> {
  return apiRequest({
    method: 'GET',
    path: `/api/v1/gyms/${encodeURIComponent(extId)}`,
    schema: GymDetailSchema,
    signal,
  });
}

/**
 * `GET /api/v1/gyms/{gymExtId}/routes` — 암장 활성 루트 목록.
 *
 * 인증 필수 (SecurityConfig 의 `/api/v1/gyms/*\/routes` 매처).
 */
export function fetchGymRoutes(
  accessToken: string,
  gymExtId: string,
  cursor?: number | null,
  size?: number,
  signal?: AbortSignal,
): Promise<RouteList> {
  const params = new URLSearchParams();
  if (cursor !== undefined && cursor !== null) {
    params.set('cursor', String(cursor));
  }
  if (size !== undefined) {
    params.set('size', String(size));
  }
  const qs = params.toString();
  return apiRequest({
    method: 'GET',
    path: `/api/v1/gyms/${encodeURIComponent(gymExtId)}/routes${qs ? `?${qs}` : ''}`,
    accessToken,
    schema: RouteListSchema,
    signal,
  });
}

// ===== Social (좋아요·댓글) =====

/**
 * `POST/DELETE /api/v1/feed-posts/{extId}/like` — 좋아요 토글.
 *
 * 단일 함수로 두 동작을 합쳐 호출부 분기를 단순화한다. action 은 명시적으로 받아
 * 호출 의도를 명확히 한다 (현재 상태 → 반대 동작 자동 추론하지 않음).
 */
export function togglePostLike(
  accessToken: string,
  postExtId: string,
  action: 'like' | 'unlike',
  signal?: AbortSignal,
): Promise<LikeToggleResponse> {
  return apiRequest({
    method: action === 'like' ? 'POST' : 'DELETE',
    path: `/api/v1/feed-posts/${encodeURIComponent(postExtId)}/like`,
    accessToken,
    schema: LikeToggleResponseSchema,
    signal,
  });
}

/**
 * `GET /api/v1/feed-posts/{extId}/comments?cursor=&size=` — 댓글 목록 (커서 페이지).
 */
export function fetchComments(
  accessToken: string,
  postExtId: string,
  cursor?: number | null,
  size?: number,
  signal?: AbortSignal,
): Promise<CommentList> {
  const params = new URLSearchParams();
  if (cursor !== undefined && cursor !== null) {
    params.set('cursor', String(cursor));
  }
  if (size !== undefined) {
    params.set('size', String(size));
  }
  const qs = params.toString();
  return apiRequest({
    method: 'GET',
    path: `/api/v1/feed-posts/${encodeURIComponent(postExtId)}/comments${qs ? `?${qs}` : ''}`,
    accessToken,
    schema: CommentListSchema,
    signal,
  });
}

/**
 * `POST /api/v1/feed-posts/{extId}/comments` — 댓글 작성.
 *
 * `parentExtId` 가 주어지면 대댓글, 그렇지 않으면 일반 댓글.
 */
export function createComment(
  accessToken: string,
  postExtId: string,
  content: string,
  parentExtId?: string | null,
  signal?: AbortSignal,
): Promise<Comment> {
  return apiRequest({
    method: 'POST',
    path: `/api/v1/feed-posts/${encodeURIComponent(postExtId)}/comments`,
    accessToken,
    body: { content, parentExtId: parentExtId ?? null },
    schema: CommentSchema,
    signal,
  });
}

/**
 * `DELETE /api/v1/comments/{extId}` — 댓글 삭제 (본인만, 백엔드에서 강제).
 *
 * 204 No Content 응답.
 */
export function deleteComment(
  accessToken: string,
  commentExtId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequest({
    method: 'DELETE',
    path: `/api/v1/comments/${encodeURIComponent(commentExtId)}`,
    accessToken,
    schema: z.void(),
    signal,
  });
}

// ===== Media (F5 PR-3) =====

/**
 * `POST /api/v1/media/presign` — UPLOADING row 생성 + S3 PUT presigned URL 발급.
 *
 * 응답의 `uploadUrl` 로 PUT 요청 시 `Content-Type` 은 요청 mime 과 동일, 본문 바이트는
 * 정확히 byteSize 와 일치해야 한다 (서명에 박혀 다른 값은 S3 가 거부 — PR #90 I2).
 */
export function presignMedia(
  accessToken: string,
  body: { kind: MediaKind; mime: string; byteSize: number },
  signal?: AbortSignal,
): Promise<PresignResponse> {
  return apiRequest({
    method: 'POST',
    path: '/api/v1/media/presign',
    accessToken,
    body,
    schema: PresignResponseSchema,
    signal,
  });
}

/**
 * `POST /api/v1/media/{id}/complete` — S3 PUT 성공 후 호출. UPLOADING → READY 전환 +
 * cdnUrl 채워짐. 본인 소유 X 시 403, UPLOADING 외 상태에서 호출 시 409.
 */
export function completeMedia(
  accessToken: string,
  mediaId: number,
  body: {
    byteSize: number;
    width: number | null;
    height: number | null;
    durationMs: number | null;
  },
  signal?: AbortSignal,
): Promise<CompleteResponse> {
  return apiRequest({
    method: 'POST',
    path: `/api/v1/media/${mediaId}/complete`,
    accessToken,
    body,
    schema: CompleteResponseSchema,
    signal,
  });
}
