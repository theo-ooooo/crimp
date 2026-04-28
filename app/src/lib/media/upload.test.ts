import { uploadCapturedMedia, MediaUploadError } from './upload';
import * as endpoints from '@/lib/api/endpoints';
import type { CapturedMedia } from '@/lib/camera/types';

jest.mock('@/lib/api/endpoints');

const mockedPresign = endpoints.presignMedia as jest.MockedFunction<typeof endpoints.presignMedia>;
const mockedComplete = endpoints.completeMedia as jest.MockedFunction<typeof endpoints.completeMedia>;

const captured: CapturedMedia = {
  kind: 'IMAGE',
  uri: 'file:///tmp/photo.jpg',
  mime: 'image/jpeg',
  byteSize: 1234,
  width: 1920,
  height: 1080,
  durationMs: null,
};

describe('uploadCapturedMedia', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
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
      cdnUrl: 'https://cdn.test/media/2026-04-29/01HMEDIA.jpg',
      thumbnailCdnUrl: null,
      createdAt: '2026-04-29T13:59:00Z',
    });

    // 1st fetch (file read) → blob, 2nd fetch (S3 PUT) → 200
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ blob: async () => ({ size: 1234 }) })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await uploadCapturedMedia('access', captured);

    expect(result.id).toBe(42);
    expect(result.cdnUrl).toBe('https://cdn.test/media/2026-04-29/01HMEDIA.jpg');
    expect(mockedPresign).toHaveBeenCalledWith('access', {
      kind: 'IMAGE', mime: 'image/jpeg', byteSize: 1234,
    }, undefined);
    expect(mockedComplete).toHaveBeenCalledWith('access', 42, {
      byteSize: 1234, width: 1920, height: 1080, durationMs: null,
    }, undefined);
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
      id: 42, extId: 'x', uploadUrl: 'https://s3.test/p',
      s3Key: 'k', expiresAt: '', mime: 'image/jpeg',
    });
    global.fetch = (jest.fn()
      .mockResolvedValueOnce({ blob: async () => ({ size: 1234 }) })
      .mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' })) as unknown as typeof fetch;

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
      id: 42, extId: 'x', uploadUrl: 'https://s3.test/p',
      s3Key: 'k', expiresAt: '', mime: 'image/jpeg',
    });
    global.fetch = (jest.fn().mockRejectedValue(new Error('ENOENT'))) as unknown as typeof fetch;

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
