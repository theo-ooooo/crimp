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
