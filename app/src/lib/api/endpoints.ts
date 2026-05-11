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
  CrewDetailSchema,
  CrewJoinRequestListSchema,
  CrewJoinRequestSchema,
  CrewListSchema,
  CrewMemberListSchema,
  CrewMeetupListSchema,
  CrewMeetupSchema,
  type CreateCrewBody,
  type CreateCrewJoinRequestBody,
  type CreateCrewMeetupBody,
  type CrewDetail,
  type CrewJoinRequest,
  type CrewJoinRequestList,
  type CrewJoinRequestStatus,
  type CrewList,
  type CrewMemberList,
  type CrewMeetup,
  type CrewMeetupList,
  type CrewLevelBand,
  type CrewStyle,
  type UpdateCrewBody,
} from '@/lib/schemas/crew';
import {
  GymDetailSchema,
  GymActiveSessionsSchema,
  GymListSchema,
  GymRecentActivitySchema,
  RouteListSchema,
  type GymDetail,
  type GymActiveSessions,
  type GymList,
  type GymRecentActivity,
  type RouteList,
} from '@/lib/schemas/gym';
import {
  HealthResponseSchema,
  type HealthResponse,
} from '@/lib/schemas/health';
import {
  CompleteResponseSchema,
  PresignResponseSchema,
  type CompleteResponse,
  type MediaKind,
  type MediaUsage,
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

function buildQueryString(
  entries: Array<[key: string, value: string | number | null | undefined]>,
): string {
  const parts: string[] = [];
  for (const [key, value] of entries) {
    if (value === undefined || value === null) {
      continue;
    }
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(String(value));
    parts.push(`${encodedKey}=${encodedValue}`);
  }
  return parts.join('&');
}

// ===== Auth =====

/**
 * `POST /api/v1/auth/oauth/{provider}` — provider 가 발급한 idToken 을 백엔드에 제출하고
 * Crimp JWT (access/refresh) 쌍을 받는다.
 *
 * provider 는 백엔드 `OauthProvider` enum 의 lower-case 표현 (`kakao`, `apple`).
 *
 * (PR #112) `nonce` 는 client 가 OAuth authorize 시 생성·전송한 원본 값. Apple 은
 * SHA-256 hex, Kakao 는 평문으로 비교 (서버 측). 미전송 시 서버는 검증을 건너뛴다.
 */
export function exchangeOauth(
  provider: OauthProvider,
  idToken: string,
  nonce?: string,
  signal?: AbortSignal,
): Promise<TokenResponse> {
  return apiRequest({
    method: 'POST',
    path: `/api/v1/auth/oauth/${provider}`,
    body: nonce ? { idToken, nonce } : { idToken },
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

export function fetchMe(
  accessToken: string,
  signal?: AbortSignal,
): Promise<Me> {
  return apiRequest({
    method: 'GET',
    path: '/api/v1/me',
    accessToken,
    schema: MeSchema as z.ZodType<Me>,
    signal,
  });
}

/** `DELETE /api/v1/me` — 내 계정 탈퇴. 서버에서 계정을 soft-delete 하고 refresh token 을 폐기한다. */
export function deleteMe(
  accessToken: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequest({
    method: 'DELETE',
    path: '/api/v1/me',
    accessToken,
    schema: z.void(),
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
    schema: MeSchema as z.ZodType<Me>,
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
  const qs = buildQueryString([
    ['cursor', cursor],
    ['size', size],
  ]);
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
  const qs = buildQueryString([
    ['cursor', cursor],
    ['q', q && q.length > 0 ? q : undefined],
    ['brand', brand && brand.length > 0 ? brand : undefined],
    ['size', size],
  ]);
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
  const qs = buildQueryString([
    ['filter', filter],
    ['cursor', cursor],
    ['size', size],
  ]);
  return apiRequest({
    method: 'GET',
    path: `/api/v1/feed?${qs}`,
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
  const qs = buildQueryString([
    ['cursor', cursor],
    ['size', size],
  ]);
  return apiRequest({
    method: 'GET',
    path: `/api/v1/gyms/${encodeURIComponent(gymExtId)}/routes${qs ? `?${qs}` : ''}`,
    accessToken,
    schema: RouteListSchema,
    signal,
  });
}

/** `GET /api/v1/gyms/{gymExtId}/recent-activity?size=` — 최근 활동 N건. */
export function fetchGymRecentActivity(
  gymExtId: string,
  size?: number,
  signal?: AbortSignal,
): Promise<GymRecentActivity> {
  const qs = buildQueryString([
    ['size', size],
  ]);
  return apiRequest({
    method: 'GET',
    path: `/api/v1/gyms/${encodeURIComponent(gymExtId)}/recent-activity${qs ? `?${qs}` : ''}`,
    schema: GymRecentActivitySchema,
    signal,
  });
}

/** `GET /api/v1/gyms/{gymExtId}/active-sessions` — 현재 운동중 현황. */
export function fetchGymActiveSessions(
  gymExtId: string,
  signal?: AbortSignal,
): Promise<GymActiveSessions> {
  return apiRequest({
    method: 'GET',
    path: `/api/v1/gyms/${encodeURIComponent(gymExtId)}/active-sessions`,
    schema: GymActiveSessionsSchema,
    signal,
  });
}

// ===== Crews =====

export type CrewListFilters = {
  q?: string;
  region?: string;
  gymExtId?: string;
  levelBand?: CrewLevelBand;
  style?: CrewStyle;
};

/** `GET /api/v1/crews` — 공개 크루 목록. 인증 사용자 기준 myStatus 포함. */
export function fetchCrews(
  accessToken: string,
  cursor?: number | null,
  filters: CrewListFilters = {},
  size?: number,
  signal?: AbortSignal,
): Promise<CrewList> {
  const qs = buildQueryString([
    ['cursor', cursor],
    ['q', filters.q && filters.q.length > 0 ? filters.q : undefined],
    ['region', filters.region && filters.region.length > 0 ? filters.region : undefined],
    ['gymExtId', filters.gymExtId && filters.gymExtId.length > 0 ? filters.gymExtId : undefined],
    ['levelBand', filters.levelBand],
    ['style', filters.style],
    ['size', size],
  ]);
  return apiRequest({
    method: 'GET',
    path: `/api/v1/crews${qs ? `?${qs}` : ''}`,
    accessToken,
    schema: CrewListSchema,
    signal,
  });
}

/** `GET /api/v1/crews/{extId}` — 크루 상세. */
export function fetchCrew(
  accessToken: string,
  extId: string,
  signal?: AbortSignal,
): Promise<CrewDetail> {
  return apiRequest({
    method: 'GET',
    path: `/api/v1/crews/${encodeURIComponent(extId)}`,
    accessToken,
    schema: CrewDetailSchema,
    signal,
  });
}

/** `POST /api/v1/crews` — 크루 생성. */
export function createCrew(
  accessToken: string,
  body: CreateCrewBody,
  signal?: AbortSignal,
): Promise<CrewDetail> {
  return apiRequest({
    method: 'POST',
    path: '/api/v1/crews',
    accessToken,
    body,
    schema: CrewDetailSchema,
    signal,
  });
}

/** `PATCH /api/v1/crews/{extId}` — 크루 기본 정보 수정. */
export function updateCrew(
  accessToken: string,
  extId: string,
  body: UpdateCrewBody,
  signal?: AbortSignal,
): Promise<CrewDetail> {
  return apiRequest({
    method: 'PATCH',
    path: `/api/v1/crews/${encodeURIComponent(extId)}`,
    accessToken,
    body,
    schema: CrewDetailSchema,
    signal,
  });
}

/** `POST /api/v1/crews/{extId}/join-requests` — 가입 요청 생성. */
export function requestCrewJoin(
  accessToken: string,
  crewExtId: string,
  body: CreateCrewJoinRequestBody,
  signal?: AbortSignal,
): Promise<CrewJoinRequest> {
  return apiRequest({
    method: 'POST',
    path: `/api/v1/crews/${encodeURIComponent(crewExtId)}/join-requests`,
    accessToken,
    body,
    schema: CrewJoinRequestSchema,
    signal,
  });
}

/** `DELETE /api/v1/crews/{extId}/join-requests/me` — 내 대기 가입 요청 취소. */
export function cancelMyCrewJoinRequest(
  accessToken: string,
  crewExtId: string,
  signal?: AbortSignal,
): Promise<CrewJoinRequest> {
  return apiRequest({
    method: 'DELETE',
    path: `/api/v1/crews/${encodeURIComponent(crewExtId)}/join-requests/me`,
    accessToken,
    schema: CrewJoinRequestSchema,
    signal,
  });
}

/** `GET /api/v1/crews/{extId}/join-requests` — 가입 요청 목록. OWNER/ADMIN 전용. */
export function fetchCrewJoinRequests(
  accessToken: string,
  crewExtId: string,
  status?: CrewJoinRequestStatus,
  cursor?: number | null,
  size?: number,
  signal?: AbortSignal,
): Promise<CrewJoinRequestList> {
  const qs = buildQueryString([
    ['status', status],
    ['cursor', cursor],
    ['size', size],
  ]);
  return apiRequest({
    method: 'GET',
    path: `/api/v1/crews/${encodeURIComponent(crewExtId)}/join-requests${qs ? `?${qs}` : ''}`,
    accessToken,
    schema: CrewJoinRequestListSchema,
    signal,
  });
}

export function decideCrewJoinRequest(
  accessToken: string,
  crewExtId: string,
  requestExtId: string,
  decision: 'approve' | 'reject',
  signal?: AbortSignal,
): Promise<CrewJoinRequest> {
  return apiRequest({
    method: 'POST',
    path: `/api/v1/crews/${encodeURIComponent(crewExtId)}/join-requests/${encodeURIComponent(requestExtId)}:${decision}`,
    accessToken,
    schema: CrewJoinRequestSchema,
    signal,
  });
}

/** `GET /api/v1/crews/{extId}/members` — ACTIVE 멤버 목록. */
export function fetchCrewMembers(
  accessToken: string,
  crewExtId: string,
  cursor?: number | null,
  size?: number,
  signal?: AbortSignal,
): Promise<CrewMemberList> {
  const qs = buildQueryString([
    ['cursor', cursor],
    ['size', size],
  ]);
  return apiRequest({
    method: 'GET',
    path: `/api/v1/crews/${encodeURIComponent(crewExtId)}/members${qs ? `?${qs}` : ''}`,
    accessToken,
    schema: CrewMemberListSchema,
    signal,
  });
}

/** `DELETE /api/v1/crews/{extId}/members/me` — 내 크루 탈퇴. */
export function leaveCrew(
  accessToken: string,
  crewExtId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequest({
    method: 'DELETE',
    path: `/api/v1/crews/${encodeURIComponent(crewExtId)}/members/me`,
    accessToken,
    schema: z.void(),
    signal,
  });
}

/** `GET /api/v1/crews/{extId}/meetups` — 크루 모임 목록. */
export function fetchCrewMeetups(
  accessToken: string,
  crewExtId: string,
  size?: number,
  signal?: AbortSignal,
): Promise<CrewMeetupList> {
  const qs = buildQueryString([['size', size]]);
  return apiRequest({
    method: 'GET',
    path: `/api/v1/crews/${encodeURIComponent(crewExtId)}/meetups${qs ? `?${qs}` : ''}`,
    accessToken,
    schema: CrewMeetupListSchema,
    signal,
  });
}

/** `POST /api/v1/crews/{extId}/meetups` — 크루 모임 생성. */
export function createCrewMeetup(
  accessToken: string,
  crewExtId: string,
  body: CreateCrewMeetupBody,
  signal?: AbortSignal,
): Promise<CrewMeetup> {
  return apiRequest({
    method: 'POST',
    path: `/api/v1/crews/${encodeURIComponent(crewExtId)}/meetups`,
    accessToken,
    body,
    schema: CrewMeetupSchema,
    signal,
  });
}

/** `GET /api/v1/meetups` — 전체 모임 목록. */
export function fetchMeetups(
  accessToken: string,
  size?: number,
  signal?: AbortSignal,
): Promise<CrewMeetupList> {
  const qs = buildQueryString([['size', size]]);
  return apiRequest({
    method: 'GET',
    path: `/api/v1/meetups${qs ? `?${qs}` : ''}`,
    accessToken,
    schema: CrewMeetupListSchema,
    signal,
  });
}

/** `POST /api/v1/meetups` — 독립/크루 모임 생성. */
export function createMeetup(
  accessToken: string,
  body: CreateCrewMeetupBody,
  signal?: AbortSignal,
): Promise<CrewMeetup> {
  return apiRequest({
    method: 'POST',
    path: '/api/v1/meetups',
    accessToken,
    body,
    schema: CrewMeetupSchema,
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
  const qs = buildQueryString([
    ['cursor', cursor],
    ['size', size],
  ]);
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
  body: { kind: MediaKind; usage?: MediaUsage; mime: string; byteSize: number },
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
 * `POST /api/v1/media/{id}/complete` — S3 PUT 성공 후 호출. UPLOADING → READY 전환.
 * 대표 variant 가 준비된 경우에만 cdnUrl 이 채워짐. 본인 소유 X 시 403, UPLOADING 외 상태에서 호출 시 409.
 */
export function completeMedia(
  accessToken: string,
  mediaId: number,
  body: {
    byteSize: number;
    width: number | null;
    height: number | null;
    durationMs: number | null;
    /** IMAGE 완료 시: 이 id 의 VIDEO(이미 READY)에 대표 썸네일로 연결 */
    attachAsPosterForVideoId?: number;
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
