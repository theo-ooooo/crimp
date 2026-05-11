/**
 * 카메라 시트가 캡처를 마쳤을 때 부모에게 전달하는 결과 (PR #91, F5).
 *
 * 후속 PR-3 (`feature/app-media-upload`) 가 본 객체를 받아 `/api/v1/media/presign` →
 * S3 PUT → `/api/v1/media/{id}/complete` 흐름으로 업로드한다. byteSize 는 presigned URL
 * 의 서명에 박혀 정확히 일치해야 하므로(PR #90 I2), 클라가 캡처 직후 확정한 값을 사용.
 */
export type CapturedMedia = {
  /** 로컬 파일 URI (`file://...` 또는 `/var/...` 형태). */
  uri: string;
  /** 업로드 시 사용할 Content-Type. */
  mime:
    | 'image/jpeg'
    | 'image/png'
    | 'image/heic'
    | 'image/webp'
    | 'video/mp4'
    | 'video/quicktime';
  /** 파일 크기. presigned URL 의 서명에 박힘 — 다른 크기로 PUT 시 S3 거부. */
  byteSize: number;
  /** 이미지 가로 픽셀. 영상은 vision-camera 4/5 가 직접 노출하지 않아 null 가능. */
  width: number | null;
  /** 이미지 세로 픽셀. */
  height: number | null;
  /** 영상 길이(ms). 사진은 null. */
  durationMs: number | null;
  /** 캡처 종류. */
  kind: 'IMAGE' | 'VIDEO';
};
