import { z } from 'zod';

import {
  TokenResponseSchema,
  type OauthProvider,
  type TokenResponse,
} from '@/lib/schemas/auth';
import {
  AttemptListSchema,
  AttemptSchema,
  type Attempt,
  type AttemptList,
  type LogAttemptBody,
  type UpdateAttemptBody,
} from '@/lib/schemas/attempt';
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
import { MeSchema, type Me } from '@/lib/schemas/me';
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
 * `POST /api/v1/auth/oauth/{provider}` — provider OIDC `id_token` 을 백엔드 JWT 로 교환.
 *
 * 인증이 필요 없는 공개 엔드포인트이므로 `accessToken` 을 전달하지 않는다.
 */
export function exchangeOauth(
  provider: OauthProvider,
  idToken: string,
  signal?: AbortSignal,
): Promise<TokenResponse> {
  return apiRequest({
    method: 'POST',
    path: `/api/v1/auth/oauth/${encodeURIComponent(provider)}`,
    body: { idToken },
    schema: TokenResponseSchema,
    signal,
  });
}

/**
 * `POST /api/v1/auth/refresh` — refresh 토큰으로 access·refresh 재발급.
 */
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

/**
 * `POST /api/v1/auth/logout` — refresh 토큰 폐기 (Redis 블랙리스트). 204 No Content.
 */
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

/**
 * `GET /api/v1/health` (공개) 호출.
 */
export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest({
    method: 'GET',
    path: '/api/v1/health',
    schema: HealthResponseSchema,
    signal,
  });
}

/**
 * `GET /api/v1/me` (Bearer 필요) 호출.
 */
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
 * `PATCH /api/v1/me/profile` (Bearer 필요) — 내 프로필 부분 수정.
 *
 * 모든 필드는 선택. `null` 을 보내면 백엔드는 "변경 없음" 으로 해석한다
 * (현재 `UserService.updateMyProfile` 은 `if (cmd.field() != null)` 가드).
 * 따라서 nullable 필드를 실제로 클리어하려면 백엔드 변경이 필요하다.
 */
export interface UpdateProfileBody {
  nickname?: string;
  bio?: string;
  levelSelf?: number;
  mainGymId?: number;
  avatarMediaId?: number;
}

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

/**
 * `GET /api/v1/me/stats` (Bearer 필요) — 홈 대시보드 집계.
 *
 * 백엔드는 KST 기준으로 이번 주(월~일) 세션·완등 수, 누적 카운트, 최고 그레이드를 반환한다.
 */
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
 * `GET /api/v1/me/sessions` — 내 세션 목록 (커서 기반 페이지네이션).
 *
 * - `cursor`: 직전 응답 `page.nextCursor` 를 그대로 전달. 첫 호출에선 `null`.
 * - `size`: 서버 기본값 사용 시 생략.
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

/**
 * `POST /api/v1/sessions` — 세션 시작.
 */
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

/**
 * `GET /api/v1/sessions/{extId}` — 세션 단건 조회.
 */
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

/**
 * `PATCH /api/v1/sessions/{extId}` — 세션 수정 (종료 시각/노트/컨디션).
 */
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

/**
 * `DELETE /api/v1/sessions/{extId}` — 세션 소프트 삭제. 204.
 */
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

/**
 * `GET /api/v1/sessions/{sessionExtId}/attempts` — 시도 목록.
 */
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

/**
 * `POST /api/v1/sessions/{sessionExtId}/attempts` — 시도 기록.
 */
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

/**
 * `PATCH /api/v1/attempts/{extId}` — 시도 수정.
 */
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

/**
 * `DELETE /api/v1/attempts/{extId}` — 시도 삭제. 204.
 */
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
 * `GET /api/v1/gyms` — 암장 검색·목록 (커서 페이지네이션, 공개).
 *
 * - `cursor`: 직전 응답 `page.nextCursor` 를 그대로 전달. 첫 호출에선 `null`.
 * - `q`: 이름/주소 검색어 (선택).
 * - `brand`: 브랜드 필터 (선택).
 * - `size`: 서버 기본값 사용 시 생략.
 */
export function fetchGyms(
  cursor?: number | null,
  q?: string | null,
  brand?: string | null,
  size?: number,
  signal?: AbortSignal,
): Promise<GymList> {
  const params = new URLSearchParams();
  if (cursor !== undefined && cursor !== null) {
    params.set('cursor', String(cursor));
  }
  if (q !== undefined && q !== null && q !== '') {
    params.set('q', q);
  }
  if (brand !== undefined && brand !== null && brand !== '') {
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

/**
 * `GET /api/v1/gyms/{extId}` — 암장 단건 조회 (공개).
 */
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

// ===== Feed =====

/**
 * `GET /api/v1/feed` — 피드 목록 (Bearer 필요, 커서 기반 페이지네이션).
 *
 * - `filter`: "popular" (기본) / "my-gym" / "friends". 미인식 값은 서버에서 popular 로 폴백.
 * - `cursor`: 직전 응답 `page.nextCursor` 를 그대로 전달. 첫 호출에선 `null`.
 * - `size`: 서버 기본값 사용 시 생략 (서버 default 20, max 50).
 */
export function fetchFeed(
  accessToken: string,
  filter?: FeedFilter | null,
  cursor?: number | null,
  size?: number,
  signal?: AbortSignal,
): Promise<FeedList> {
  const params = new URLSearchParams();
  if (filter !== undefined && filter !== null) {
    params.set('filter', filter);
  }
  if (cursor !== undefined && cursor !== null) {
    params.set('cursor', String(cursor));
  }
  if (size !== undefined) {
    params.set('size', String(size));
  }
  const qs = params.toString();
  return apiRequest({
    method: 'GET',
    path: `/api/v1/feed${qs ? `?${qs}` : ''}`,
    accessToken,
    schema: FeedListSchema,
    signal,
  });
}

// ===== Feed Post: Likes & Comments (PR #56 — SocialController) =====

/**
 * `POST /api/v1/feed-posts/{extId}/like` 또는 `DELETE` — 좋아요 토글.
 *
 * 단일 함수로 두 동사를 처리해 호출부의 분기를 줄인다 (UI 가 `liked` 상태에 따라
 * action 만 결정). 응답은 두 동사 모두 `LikeToggleResponse` 형태.
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
 * `GET /api/v1/feed-posts/{extId}/comments` — 댓글 목록 (커서 페이지네이션).
 *
 * - `cursor`: 직전 응답 `page.nextCursor` 를 그대로 전달. 첫 호출에선 `null`.
 * - `size`: 서버 기본값 사용 시 생략.
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
 * `parentExtId` 는 대댓글일 때만 지정. UI Phase 1.5 는 평탄 리스트.
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
 * `DELETE /api/v1/comments/{extId}` — 댓글 삭제 (본인만, 백엔드 강제). 204.
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

/**
 * `GET /api/v1/gyms/{gymExtId}/routes` — 암장의 활성 루트 목록 (Bearer 필요).
 *
 * - id DESC (최근 세팅 우선), 커서 페이지네이션.
 * - 인증은 SecurityConfig 의 `/api/v1/gyms/&#42;/routes` 매처가 강제.
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
