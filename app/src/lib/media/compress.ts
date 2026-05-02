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

import { Platform } from 'react-native';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { Video, getFileSize } from 'react-native-compressor';

import type { CapturedMedia } from '@/lib/camera/types';

const IMAGE_MAX_DIMENSION = 1920;
const IMAGE_QUALITY = 80;

/**
 * 입력 CapturedMedia 의 압축본을 반환. 압축 실패 / 결과가 더 크면 원본을 그대로 반환해
 * 업로드 흐름이 회귀하지 않게 한다.
 */
export async function compressCapturedMedia(captured: CapturedMedia): Promise<CapturedMedia> {
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
    // ImageResizer 가 직접 size 반환 — measureFileBytes(=fetch) 우회 가능.
    if (result.size != null && result.size >= captured.byteSize) {
      // 압축이 오히려 키우면 (이미 작은 파일) 원본 유지.
      return captured;
    }
    return {
      ...captured,
      uri: newUri,
      mime: 'image/jpeg',
      byteSize: result.size ?? captured.byteSize,
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
    // react-native-compressor 의 getFileSize 로 native 측 파일 크기 조회 — measureFileBytes
    // (fetch 기반) 우회. 실패 시 원본 byteSize 폴백.
    let newSize = captured.byteSize;
    try {
      const reported = await getFileSize(newUri);
      if (typeof reported === 'number' && reported > 0) {
        newSize = reported;
      }
    } catch {
      // 측정 실패 — fallback. presign 시 byteSize 가 실제와 어긋나면 S3 가 거부할 수
      // 있어 차라리 원본 유지가 안전.
      return captured;
    }
    if (newSize >= captured.byteSize) {
      return captured;
    }
    // mime 은 H.264/H.265 일 가능성. iOS 결과는 일반적으로 mp4. compressor 가 quicktime
    // 형태를 그대로 두는 경우가 있어 platform 별 mime 추정.
    const mime: CapturedMedia['mime'] =
      Platform.OS === 'ios' && newUri.toLowerCase().endsWith('.mov')
        ? 'video/quicktime'
        : 'video/mp4';
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
