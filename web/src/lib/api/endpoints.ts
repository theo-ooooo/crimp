import { HealthResponseSchema, type HealthResponse } from '@/lib/schemas/health';
import { MeSchema, type Me } from '@/lib/schemas/me';

import { apiRequest } from './client';

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
