/**
 * 업로드 전 미디어 압축 (PR-F1).
 *
 * 흐름: CameraSheet 캡처 → 본 모듈로 압축 → 결과 URI/byteSize/mime 으로 presign + S3 PUT.
 *
 * 압축 정책:
 * - 이미지: 긴 변 1920px 로 리사이즈 (원본 더 작으면 그대로 유지) + JPEG quality 80.
 *   HEIC 입력도 JPEG 으로 통일 → 백엔드 mime 화이트리스트 단순화 + 모든 클라가 디코딩 OK.
 * - 비디오: react-native-compressor 의 'medium' preset (≈ 720p / 2 Mbps H.264 baseline).
 *   원본보다 큰 결과는 폐기하고 원본 유지 (회귀 방지).
 *
 * 라이브 디바이스에서만 동작 — 로컬 jest 환경에서는 native 모듈이 없어 import 실패하므로
 * 본 모듈을 호출하는 경로는 RN 컴포넌트/hook 안에서만 (jest 가 transform 안 함).
 */

import ImageResizer from '@bam.tech/react-native-image-resizer';
import { Video, getFileSize } from 'react-native-compressor';

import type { CapturedMedia } from '@/lib/camera/types';

const IMAGE_MAX_DIMENSION = 1920;
const IMAGE_QUALITY = 80;

/**
 * 입력 CapturedMedia 의 압축본을 반환. 압축 실패 / 결과가 더 크면 원본을 그대로 반환해
 * 업로드 흐름이 회귀하지 않게 한다.
 *
 * (PR #116 Codex P2) signal 이 이미 abort 된 경우 native 압축 자체를 시작하지 않고
 * AbortError 로 빠짐. 압축 라이브러리는 mid-flight 취소를 지원하지 않아 이 시점 이후
 * 의 cancel 은 결과를 폐기할 뿐 작업 자체는 끝까지 돈다 — 비용 ↓ 의 첫 단계.
 */
export async function compressCapturedMedia(
  captured: CapturedMedia,
  signal?: AbortSignal,
): Promise<CapturedMedia> {
  if (signal?.aborted) {
    throw new DOMException('aborted before compression', 'AbortError');
  }
  if (captured.kind === 'IMAGE') {
    return compressImage(captured);
  }
  return compressVideo(captured);
}

async function compressImage(captured: CapturedMedia): Promise<CapturedMedia> {
  try {
    const result = await ImageResizer.createResizedImage(
      captured.uri,
      IMAGE_MAX_DIMENSION,
      IMAGE_MAX_DIMENSION,
      'JPEG',
      IMAGE_QUALITY,
      0, // rotation — EXIF 그대로
      undefined, // outputPath — 라이브러리가 cache 디렉터리에 저장
      false, // keepMeta — EXIF (위치) 제거. 프라이버시 + 사이즈 ↓
      { mode: 'contain', onlyScaleDown: true },
    );
    const newUri = result.uri.startsWith('file://') ? result.uri : `file://${result.uri}`;
    // (PR #116 리뷰 B2 + Codex P1) iOS ImageResizer 는 NSFileSize 조회 실패 시 size=0
    // 또는 누락된 응답을 줄 수 있다. 그 경우 새 URI 로 PUT 했을 때 정확한 byteSize 를 알 수
    // 없어 presign 의 Content-Length 와 어긋남 → S3 SignatureMismatch. 신뢰 가능한 size
    // 가 없으면 압축 결과를 채택하지 않고 원본 유지가 안전.
    const reportedSize =
      typeof result.size === 'number' && result.size > 0 ? result.size : null;
    if (reportedSize === null || reportedSize >= captured.byteSize) {
      return captured;
    }
    return {
      ...captured,
      uri: newUri,
      mime: 'image/jpeg',
      byteSize: reportedSize,
      width: result.width ?? captured.width,
      height: result.height ?? captured.height,
    };
  } catch {
    // 압축 실패는 silent fallback — 업로드 자체는 진행 (원본 그대로).
    return captured;
  }
}

async function compressVideo(captured: CapturedMedia): Promise<CapturedMedia> {
  try {
    const compressedPath = await Video.compress(
      captured.uri,
      {
        compressionMethod: 'auto',
        // 'medium': ~720p / 2 Mbps H.264. 'low' / 'high' 도 사용 가능.
        // 압축 진행 콜백은 현 단계 미사용 — 진행률 UX 는 후속 (F3 카드 표시 후 검토).
        maxSize: 1280, // 긴 변 px 상한
      },
      // onProgress 미사용 — 향후 진행률 UX 도입 시 콜백 연결.
    );
    const newUri = compressedPath.startsWith('file://')
      ? compressedPath
      : `file://${compressedPath}`;
    // (PR #116 리뷰 B1) react-native-compressor 의 getFileSize 는 Promise<string>
    // — 이전엔 typeof === 'number' 가드라 항상 폴백을 타 비디오 압축이 무력화됐음.
    // Number(reported) 로 명시 변환 + isFinite + >0 검증.
    let newSize: number | null = null;
    try {
      const reported = await getFileSize(newUri);
      const parsed = typeof reported === 'number' ? reported : Number(reported);
      if (Number.isFinite(parsed) && parsed > 0) {
        newSize = parsed;
      }
    } catch {
      // 측정 실패 — fallback. presign 시 byteSize 가 실제와 어긋나면 S3 가 거부할 수
      // 있어 차라리 원본 유지가 안전.
      return captured;
    }
    if (newSize === null || newSize >= captured.byteSize) {
      return captured;
    }
    // (PR #116 리뷰 I1) react-native-compressor 4.x 는 iOS/Android 모두 사실상
    // .mp4 를 출력 — compressionMethod='auto' 도 H.264 / mp4 컨테이너. 항상 mp4 로 단정.
    // 백엔드 ALLOWED_VIDEO_MIME 은 mp4/quicktime 둘 다 허용이라 차후 라이브러리 동작
    // 변동 시도 안전.
    const mime: CapturedMedia['mime'] = 'video/mp4';
    return {
      ...captured,
      uri: newUri,
      mime,
      byteSize: newSize,
    };
  } catch {
    return captured;
  }
}
