import { compressCapturedMedia } from '@/lib/media/compress';
import type { CapturedMedia } from '@/lib/camera/types';

import {
  MediaUploadError,
  uploadAvatarImage,
  uploadCapturedMedia,
  uploadVideoWithOptionalPoster,
} from './upload';
import * as endpoints from '@/lib/api/endpoints';

jest.mock('@/lib/api/endpoints');
jest.mock('@/lib/media/compress');

const mockedPresign = endpoints.presignMedia as jest.MockedFunction<typeof endpoints.presignMedia>;
const mockedComplete = endpoints.completeMedia as jest.MockedFunction<typeof endpoints.completeMedia>;
const mockedCompress = compressCapturedMedia as jest.MockedFunction<typeof compressCapturedMedia>;

const captured: CapturedMedia = {
  kind: 'IMAGE',
  uri: 'file:///tmp/photo.jpg',
  mime: 'image/jpeg',
  byteSize: 1234,
  width: 1920,
  height: 1080,
  durationMs: null,
};

const videoCaptured: CapturedMedia = {
  kind: 'VIDEO',
  uri: 'file:///tmp/video.mp4',
  mime: 'video/mp4',
  byteSize: 99_000,
  width: 1280,
  height: 720,
  durationMs: 8000,
};

const posterCaptured: CapturedMedia = {
  kind: 'IMAGE',
  uri: 'file:///tmp/poster.jpg',
  mime: 'image/jpeg',
  byteSize: 88_000,
  width: 720,
  height: 720,
  durationMs: null,
};

function completeResponse(
  id: number,
  kind: 'IMAGE' | 'VIDEO',
): import('@/lib/schemas/media').CompleteResponse {
  return {
    id,
    extId: `01HMEDIA${id}`,
    kind,
    status: 'READY',
    mime: kind === 'VIDEO' ? 'video/mp4' : 'image/jpeg',
    byteSize: kind === 'VIDEO' ? 99_000 : 88_000,
    width: kind === 'VIDEO' ? 1280 : 720,
    height: kind === 'VIDEO' ? 720 : 720,
    durationMs: kind === 'VIDEO' ? 8000 : null,
    s3Key: `media/k-${id}`,
    variantPath: `media/k-${id}.webp`,
    originalUrl: `https://cdn.test/media/k-${id}`,
    variantUrl: `https://cdn.test/media/k-${id}.webp`,
    cdnUrl: `https://cdn.test/media/k-${id}.webp`,
    thumbnailCdnUrl: null,
    createdAt: '2026-05-03T12:00:00Z',
    usage: kind === 'VIDEO' ? 'ATTEMPT' : 'ATTEMPT',
  };
}

beforeEach(() => {
  mockedCompress.mockImplementation(async (c: CapturedMedia) => c);
});

describe('uploadCapturedMedia', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
    mockedCompress.mockImplementation(async (c: CapturedMedia) => c);
  });

  it('happy path — presign → S3 PUT 200 → complete', async () => {
    mockedPresign.mockResolvedValue({
      id: 42,
      extId: '01HMEDIA',
      uploadUrl: 'https://s3.test/presigned',
      s3Key: 'media/2026-04-29/01HMEDIA.jpg',
      expiresAt: '2026-04-29T14:00:00Z',
      mime: 'image/jpeg',
    });
    mockedComplete.mockResolvedValue({
      id: 42,
      extId: '01HMEDIA',
      kind: 'IMAGE',
      status: 'READY',
      mime: 'image/jpeg',
      byteSize: 1234,
      width: 1920,
      height: 1080,
      durationMs: null,
      s3Key: 'media/2026-04-29/01HMEDIA.jpg',
      variantPath: 'media/2026-04-29/01HMEDIA.webp',
      originalUrl: 'https://cdn.test/media/2026-04-29/01HMEDIA.jpg',
      variantUrl: 'https://cdn.test/media/2026-04-29/01HMEDIA.webp',
      cdnUrl: 'https://cdn.test/media/2026-04-29/01HMEDIA.webp',
      thumbnailCdnUrl: null,
      createdAt: '2026-04-29T13:59:00Z',
    });

    // 1st fetch (file read) → blob, 2nd fetch (S3 PUT) → 200
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ blob: async () => ({ size: 1234 }) })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await uploadCapturedMedia('access', captured);

    expect(result.id).toBe(42);
    expect(result.cdnUrl).toBe('https://cdn.test/media/2026-04-29/01HMEDIA.webp');
    expect(mockedPresign).toHaveBeenCalledWith(
      'access',
      { kind: 'IMAGE', usage: 'ATTEMPT', mime: 'image/jpeg', byteSize: 1234 },
      undefined,
    );
    expect(mockedComplete).toHaveBeenCalledWith(
      'access',
      42,
      {
        byteSize: 1234,
        width: 1920,
        height: 1080,
        durationMs: null,
        attachAsPosterForVideoId: undefined,
      },
      undefined,
    );
    // S3 PUT 의 Content-Type 이 mime 과 일치
    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.test/presigned',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
      }),
    );
  });

  it('S3 PUT non-OK → MediaUploadError(s3-status), complete not called', async () => {
    mockedPresign.mockResolvedValue({
      id: 42,
      extId: 'x',
      uploadUrl: 'https://s3.test/p',
      s3Key: 'k',
      expiresAt: '',
      mime: 'image/jpeg',
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ blob: async () => ({ size: 1234 }) })
      .mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' }) as unknown as typeof fetch;

    let caught: unknown;
    try {
      await uploadCapturedMedia('access', captured);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MediaUploadError);
    expect(caught).toMatchObject({ phase: 's3-status' });
    expect(mockedComplete).not.toHaveBeenCalled();
  });

  it('local file read failure → MediaUploadError(local-read)', async () => {
    mockedPresign.mockResolvedValue({
      id: 42,
      extId: 'x',
      uploadUrl: 'https://s3.test/p',
      s3Key: 'k',
      expiresAt: '',
      mime: 'image/jpeg',
    });
    global.fetch = jest.fn().mockRejectedValue(new Error('ENOENT')) as unknown as typeof fetch;

    await expect(uploadCapturedMedia('access', captured)).rejects.toMatchObject({ phase: 'local-read' });
    expect(mockedComplete).not.toHaveBeenCalled();
  });

  it('presign error propagates as ApiError (mocked endpoint rejection)', async () => {
    mockedPresign.mockRejectedValue(new Error('413'));
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(uploadCapturedMedia('access', captured)).rejects.toThrow('413');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedComplete).not.toHaveBeenCalled();
  });
});

describe('uploadVideoWithOptionalPoster', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
    mockedCompress.mockImplementation(async (c: CapturedMedia) => c);
  });

  it('포스터 없음 — 비디오 1회 presign·PUT·complete 만', async () => {
    mockedPresign.mockResolvedValue({
      id: 10,
      extId: '01HVID',
      uploadUrl: 'https://s3.test/v',
      s3Key: 'media/v.mp4',
      expiresAt: '',
      mime: 'video/mp4',
    });
    mockedComplete.mockResolvedValue(completeResponse(10, 'VIDEO'));

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ blob: async () => ({ size: 99_000 }) })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await uploadVideoWithOptionalPoster('tok', videoCaptured, null);

    expect(result.id).toBe(10);
    expect(mockedCompress).toHaveBeenCalledTimes(1);
    expect(mockedPresign).toHaveBeenCalledTimes(1);
    expect(mockedComplete).toHaveBeenCalledTimes(1);
    expect(mockedComplete).toHaveBeenCalledWith(
      'tok',
      10,
      expect.objectContaining({
        attachAsPosterForVideoId: undefined,
        durationMs: 8000,
      }),
      undefined,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('포스터 있음 — 비디오 후 이미지 complete 에 attachAsPosterForVideoId', async () => {
    mockedPresign
      .mockResolvedValueOnce({
        id: 10,
        extId: '01HVID',
        uploadUrl: 'https://s3.test/v',
        s3Key: 'media/v.mp4',
        expiresAt: '',
        mime: 'video/mp4',
      })
      .mockResolvedValueOnce({
        id: 20,
        extId: '01HIMG',
        uploadUrl: 'https://s3.test/p',
        s3Key: 'media/p.jpg',
        expiresAt: '',
        mime: 'image/jpeg',
      });
    mockedComplete
      .mockResolvedValueOnce(completeResponse(10, 'VIDEO'))
      .mockResolvedValueOnce(completeResponse(20, 'IMAGE'));

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ blob: async () => ({ size: 99_000 }) })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ blob: async () => ({ size: 88_000 }) })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await uploadVideoWithOptionalPoster('tok', videoCaptured, posterCaptured);

    expect(result.id).toBe(10);
    expect(mockedCompress).toHaveBeenCalledTimes(2);
    expect(mockedPresign).toHaveBeenCalledTimes(2);
    expect(mockedComplete).toHaveBeenCalledTimes(2);
    expect(mockedPresign).toHaveBeenNthCalledWith(
      1,
      'tok',
      expect.objectContaining({ kind: 'VIDEO', usage: 'ATTEMPT' }),
      undefined,
    );
    expect(mockedPresign).toHaveBeenNthCalledWith(
      2,
      'tok',
      expect.objectContaining({ kind: 'IMAGE', usage: 'POSTER' }),
      undefined,
    );

    expect(mockedComplete).toHaveBeenNthCalledWith(
      1,
      'tok',
      10,
      expect.objectContaining({
        attachAsPosterForVideoId: undefined,
      }),
      undefined,
    );
    expect(mockedComplete).toHaveBeenNthCalledWith(
      2,
      'tok',
      20,
      expect.objectContaining({
        attachAsPosterForVideoId: 10,
      }),
      undefined,
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('uploadAvatarImage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
    mockedCompress.mockImplementation(async (c: CapturedMedia) => c);
  });

  it('uploads an image with AVATAR usage', async () => {
    mockedPresign.mockResolvedValue({
      id: 77,
      extId: '01HAVATAR',
      uploadUrl: 'https://s3.test/avatar',
      s3Key: 'media/users/7/avatar/image/a.jpg',
      expiresAt: '',
      mime: 'image/jpeg',
      usage: 'AVATAR',
    });
    mockedComplete.mockResolvedValue({
      ...completeResponse(77, 'IMAGE'),
      usage: 'AVATAR',
    });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ blob: async () => ({ size: 1234 }) })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await uploadAvatarImage('access', captured);

    expect(result.id).toBe(77);
    expect(mockedPresign).toHaveBeenCalledWith(
      'access',
      { kind: 'IMAGE', usage: 'AVATAR', mime: 'image/jpeg', byteSize: 1234 },
      undefined,
    );
  });
});
