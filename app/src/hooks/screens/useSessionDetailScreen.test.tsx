import React from 'react';
import { Alert } from 'react-native';
import { act, create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { fetchSession, listAttempts, updateSession } from '@/lib/api';
import type { CapturedMedia } from '@/lib/camera/types';
import { uploadCapturedMedia, uploadVideoWithOptionalPoster } from '@/lib/media/upload';

import { useSessionDetailScreen } from './useSessionDetailScreen';

jest.mock('@/lib/api', () => ({
  fetchSession: jest.fn(),
  listAttempts: jest.fn(),
  updateSession: jest.fn(),
}));
jest.mock('@/lib/media/upload', () => ({
  uploadCapturedMedia: jest.fn(),
  uploadVideoWithOptionalPoster: jest.fn(),
  MediaUploadError: class MediaUploadError extends Error {
    phase: string;
    constructor(phase: string, message: string) {
      super(message);
      this.phase = phase;
    }
  },
}));

const SESSION = {
  extId: '01JSESS00000000000000001',
  gymId: 1,
  gymNameRaw: null,
  startedAt: '2026-05-03T00:00:00.000Z',
  endedAt: null,
  durationMin: null,
  note: null,
  condition: null,
};

const CAPTURED: CapturedMedia = {
  kind: 'IMAGE',
  uri: 'file:///tmp/photo.jpg',
  mime: 'image/jpeg',
  byteSize: 1200,
  width: 800,
  height: 600,
  durationMs: null,
};

const VIDEO: CapturedMedia = {
  kind: 'VIDEO',
  uri: 'file:///tmp/video.mp4',
  mime: 'video/mp4',
  byteSize: 2400,
  width: null,
  height: null,
  durationMs: 3000,
};

const POSTER: CapturedMedia = {
  kind: 'IMAGE',
  uri: 'file:///tmp/poster.jpg',
  mime: 'image/jpeg',
  byteSize: 800,
  width: 640,
  height: 360,
  durationMs: null,
};

type HookResult = ReturnType<typeof useSessionDetailScreen>;
const cleanupFns: Array<() => void> = [];

describe('useSessionDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (fetchSession as jest.Mock).mockResolvedValue(SESSION);
    (listAttempts as jest.Mock).mockResolvedValue({ items: [], page: { nextCursor: null, size: 20 } });
    (updateSession as jest.Mock).mockResolvedValue({ ...SESSION, endedAt: '2026-05-03T01:00:00.000Z' });
  });

  afterEach(() => {
    act(() => {
      while (cleanupFns.length > 0) {
        cleanupFns.pop()?.();
      }
    });
    jest.restoreAllMocks();
  });

  it('keeps failed media upload retryable until it succeeds', async () => {
    (uploadCapturedMedia as jest.Mock)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        id: 99,
        extId: '01JMEDIA0000000000000001',
        kind: 'IMAGE',
        status: 'READY',
        cdnUrl: 'https://cdn.example.com/photo.webp',
      });
    const { latest } = await renderHook();

    await act(async () => {
      await latest.current.handleCaptured(CAPTURED);
    });

    expect(uploadCapturedMedia).toHaveBeenCalledTimes(1);
    expect(latest.current.uploadedMediaId).toBeNull();
    expect(latest.current.mediaUploadError).toBe('다시 시도해주세요. 네트워크나 사이즈 한도(이미지 20MB / 영상 200MB) 를 확인해보세요.');

    await act(async () => {
      latest.current.retryMediaUpload();
      await flush();
    });

    expect(uploadCapturedMedia).toHaveBeenCalledTimes(2);
    expect(uploadCapturedMedia).toHaveBeenLastCalledWith(
      'access-token',
      CAPTURED,
      expect.objectContaining({ onPhase: expect.any(Function) }),
    );
    expect(latest.current.uploadedMediaId).toBe(99);
    expect(latest.current.mediaUploadError).toBeNull();
  });

  it('keeps failed video and poster upload retryable with the same captured files', async () => {
    (uploadVideoWithOptionalPoster as jest.Mock)
      .mockRejectedValueOnce(new Error('poster upload failed'))
      .mockResolvedValueOnce({
        id: 100,
        extId: '01JMEDIA0000000000000002',
        kind: 'VIDEO',
        status: 'READY',
        cdnUrl: 'https://cdn.example.com/video.mp4',
      });
    const { latest } = await renderHook();

    await act(async () => {
      latest.current.onPosterUploadRequest(POSTER);
      await flush();
    });
    expect(uploadVideoWithOptionalPoster).not.toHaveBeenCalled();

    await act(async () => {
      await latest.current.handleCaptured(VIDEO);
    });

    await act(async () => {
      latest.current.onPosterUploadRequest(POSTER);
      await flush();
    });

    expect(uploadVideoWithOptionalPoster).toHaveBeenCalledTimes(1);
    expect(latest.current.uploadedMediaId).toBeNull();
    expect(latest.current.mediaUploadError).toBe('다시 시도해주세요. 네트워크나 사이즈 한도(이미지 20MB / 영상 200MB) 를 확인해보세요.');

    await act(async () => {
      latest.current.retryMediaUpload();
      await flush();
    });

    expect(uploadVideoWithOptionalPoster).toHaveBeenCalledTimes(2);
    expect(uploadVideoWithOptionalPoster).toHaveBeenLastCalledWith(
      'access-token',
      VIDEO,
      POSTER,
      expect.objectContaining({ onPhase: expect.any(Function) }),
    );
    expect(latest.current.uploadedMediaId).toBe(100);
    expect(latest.current.mediaUploadError).toBeNull();
  });
});

async function renderHook() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
      mutations: { gcTime: Infinity, retry: false },
    },
  });
  const latest: { current: HookResult } = {} as { current: HookResult };

  function Harness(): JSX.Element {
    latest.current = useSessionDetailScreen('access-token', SESSION.extId);
    return <></>;
  }

  await act(async () => {
    const renderer = create(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );
    cleanupFns.push(() => {
      renderer.unmount();
      queryClient.clear();
    });
  });
  await flushQueries();

  return { latest };
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function flushQueries(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await flush();
    });
  }
}
