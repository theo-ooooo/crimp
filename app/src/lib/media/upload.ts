import { completeMedia, presignMedia } from '@/lib/api/endpoints';
import type { CapturedMedia } from '@/lib/camera/types';
import { compressCapturedMedia } from '@/lib/media/compress';
import type { CompleteResponse, MediaUsage } from '@/lib/schemas/media';

/**
 * 캡처된 로컬 파일을 백엔드로 업로드 (PR #92, F5 PR-3).
 *
 * 흐름:
 *  1) `POST /api/v1/media/presign` → UPLOADING row + S3 PUT presigned URL
 *  2) `PUT <uploadUrl>` 직접 — 로컬 파일을 Blob 으로 읽어 전송. Content-Type 은 presign 시
 *     보낸 mime 과 동일해야 서명 일치 (PR #90 I2).
 *  3) `POST /api/v1/media/{id}/complete` → READY 전환 + cdnUrl 응답
 *
 * 실패 시점에 따라 다른 에러:
 *  - presign 단계: `ApiError` (401/4xx/422 → 한도 초과·MIME 거부 등)
 *  - PUT 단계: `MediaUploadError` (S3 가 응답 status 또는 네트워크 에러)
 *  - complete 단계: `ApiError`
 *
 * 본 함수는 retry/재시도 로직 없음 — 호출자가 사용자에게 알린 후 재시도 결정.
 */
/**
 * (PR #116 리뷰 I2) 외부 (hook) 가 spinner 라벨을 분기할 수 있도록 phase 콜백 노출.
 * 'compressing' 은 압축 단계, 'uploading' 은 presign+S3 PUT+complete 단계.
 */
export type UploadPhase = 'compressing' | 'uploading';

export async function uploadCapturedMedia(
  accessToken: string,
  captured: CapturedMedia,
  options?: {
    signal?: AbortSignal;
    onPhase?: (phase: UploadPhase) => void;
  },
): Promise<CompleteResponse> {
  const signal = options?.signal;
  // (PR #116 Codex P2) 호출 시점에 이미 abort 됐으면 네이티브 압축 자체를 시작하지 말 것.
  if (signal?.aborted) {
    throw new DOMException('aborted before upload', 'AbortError');
  }
  // 0) (PR-F1) 압축 — 이미지 1920px JPEG q80 / 비디오 ~720p 2Mbps. 실패·확장 시 원본 유지.
  // mime/byteSize 가 바뀔 수 있어 presign 에 전달할 값은 압축 결과 기준.
  options?.onPhase?.('compressing');
  const ready = await compressCapturedMedia(captured, signal);

  options?.onPhase?.('uploading');
  return uploadReadyMedia(accessToken, ready, signal);
}

export async function uploadAvatarImage(
  accessToken: string,
  image: CapturedMedia,
  options?: {
    signal?: AbortSignal;
    onPhase?: (phase: UploadPhase) => void;
  },
): Promise<CompleteResponse> {
  const signal = options?.signal;
  if (signal?.aborted) {
    throw new DOMException('aborted before upload', 'AbortError');
  }
  options?.onPhase?.('compressing');
  const ready = await compressCapturedMedia(image, signal);
  if (ready.kind !== 'IMAGE') {
    throw new MediaUploadError('local-read', 'avatar upload requires an image');
  }
  options?.onPhase?.('uploading');
  return uploadReadyMedia(accessToken, ready, signal, { usage: 'AVATAR' });
}

/**
 * 비디오 업로드 후(READY) JPEG 포스터를 올리고 `attachAsPosterForVideoId` 로 연결.
 * 반환은 비디오 미디어 `CompleteResponse`.
 */
export async function uploadVideoWithOptionalPoster(
  accessToken: string,
  video: CapturedMedia,
  poster: CapturedMedia | null,
  options?: {
    signal?: AbortSignal;
    onPhase?: (phase: UploadPhase) => void;
  },
): Promise<CompleteResponse> {
  const signal = options?.signal;
  if (signal?.aborted) {
    throw new DOMException('aborted before upload', 'AbortError');
  }
  options?.onPhase?.('compressing');
  const videoReady = await compressCapturedMedia(video, signal);
  options?.onPhase?.('uploading');
  const videoComplete = await uploadReadyMedia(accessToken, videoReady, signal);
  if (!poster) {
    return videoComplete;
  }
  const posterReady = await compressCapturedMedia(poster, signal);
  await uploadReadyMedia(accessToken, posterReady, signal, {
    usage: 'POSTER',
    attachAsPosterForVideoId: videoComplete.id,
  });
  return videoComplete;
}

async function uploadReadyMedia(
  accessToken: string,
  ready: CapturedMedia,
  signal: AbortSignal | undefined,
  options: {
    usage?: MediaUsage;
    attachAsPosterForVideoId?: number;
  } = {},
): Promise<CompleteResponse> {
  const presigned = await presignMedia(
    accessToken,
    {
      kind: ready.kind,
      usage: options.usage ?? 'ATTEMPT',
      mime: ready.mime,
      byteSize: ready.byteSize,
    },
    signal,
  );
  await putToS3(presigned.uploadUrl, ready.uri, ready.mime, signal);
  return completeMedia(
    accessToken,
    presigned.id,
    {
      byteSize: ready.byteSize,
      width: ready.width,
      height: ready.height,
      durationMs: ready.durationMs,
      attachAsPosterForVideoId: options.attachAsPosterForVideoId,
    },
    signal,
  );
}

async function putToS3(
  uploadUrl: string,
  fileUri: string,
  contentType: string,
  signal?: AbortSignal,
): Promise<void> {
  const fileFetchUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
  let blob: Blob;
  try {
    const fileRes = await fetch(fileFetchUri);
    blob = await fileRes.blob();
  } catch (e) {
    throw new MediaUploadError('local-read', describe(e));
  }

  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: 'PUT',
      // Content-Type 은 presign 서명과 일치해야 한다. RN fetch 는 Content-Length 를
      // 본문 길이에서 자동 산출하므로 수동 설정 불필요 (수동 설정 시 일부 RN 버전에서
      // 충돌 가능).
      headers: { 'Content-Type': contentType },
      body: blob,
      signal,
    });
  } catch (e) {
    throw new MediaUploadError('network', describe(e));
  }

  if (!res.ok) {
    throw new MediaUploadError(
      's3-status',
      `HTTP ${res.status} ${res.statusText ?? ''}`.trim(),
    );
  }
}

function describe(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }
  if (typeof e === 'string') {
    return e;
  }
  return 'unknown';
}

/**
 * S3 PUT 단계에서만 발생하는 에러. presign/complete 의 백엔드 에러는 `ApiError` 가 별도.
 *
 * `phase`:
 *  - `local-read` — 로컬 파일을 Blob 으로 읽기 실패
 *  - `network`   — PUT 요청 자체가 네트워크/abort 등으로 실패
 *  - `s3-status` — S3 가 4xx/5xx 응답 (서명 불일치, 사이즈 어긋남 등)
 */
export class MediaUploadError extends Error {
  readonly phase: 'local-read' | 'network' | 's3-status';

  constructor(phase: 'local-read' | 'network' | 's3-status', message: string) {
    super(message);
    this.name = 'MediaUploadError';
    this.phase = phase;
  }
}
