/**
 * 캡처된 로컬 파일의 메타 (PR #91, F5).
 *
 * vision-camera 의 `takePhoto` / `onRecordingFinished` 는 byteSize 와 정확한 mime 을
 * 직접 반환하지 않는다. 본 모듈이 다음을 보강한다:
 *
 *  - {@link measureFileBytes}: `fetch+blob` 으로 파일 byte 크기 측정
 *  - {@link readImageMeta}: 한 번의 fetch 로 byteSize + 헤더 시그니처 기반 mime 검출
 *  - {@link detectImageMime}: 헤더 12바이트 → mime
 *
 * **왜 헤더 시그니처가 필요한가** (PR #91 리뷰 B1):
 *   vision-camera v4 의 iOS 구현은 디바이스가 HEIC 모드여도 임시 파일 경로를 항상
 *   `.jpg` 확장자로 저장한다 (`FileUtils.getFilePath(fileExtension: "jpg")`). 따라서
 *   확장자 기반 mime 추정은 iOS HEIC 사용자에서 항상 `image/jpeg` 로 잘못 보고된다.
 *   → 후속 PR-3 의 presigned 서명/CDN 처리가 어긋남. 헤더 magic byte 로 실제 codec 검출.
 *
 * byteSize 정확도가 중요한 이유는 PR #90 의 presigned URL 이 `Content-Length` 를 서명에
 * 박아 다른 크기 PUT 시 S3 가 거부하기 때문 (I2 의 1차 방어선).
 */
export async function measureFileBytes(uri: string): Promise<number> {
  const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
  const res = await fetch(fileUri);
  const blob = await res.blob();
  return blob.size;
}

export type DetectedImageMime = 'image/jpeg' | 'image/heic' | 'image/png' | 'image/webp';

/**
 * 한 번의 fetch 로 byteSize + 이미지 mime 을 동시에 얻는다 — 카메라 캡처 직후 사용.
 * mime 검출에 실패하면 null. 호출자가 fallback (보통 `image/jpeg`) 처리.
 *
 * <p><b>RN 호환성</b>: React Native 의 `Blob` 폴리필은 `arrayBuffer()` 를 노출하지 않아
 * `await blob.arrayBuffer()` 가 `is not a function` 오류로 실패한다 (Android 에서 확인됨).
 * 대신 {@link XMLHttpRequest} 의 {@code responseType='arraybuffer'} 로 직접 받아온다 —
 * RN 0.75 의 fetch / XHR 둘 다 file:// 스키마를 지원하지만 XHR 만이 임의 바이너리 응답을
 * 약속한다.
 */
export async function readImageMeta(uri: string): Promise<{
  byteSize: number;
  mime: DetectedImageMime | null;
}> {
  const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
  const buf = await fetchAsArrayBuffer(fileUri);
  const head = new Uint8Array(buf, 0, Math.min(16, buf.byteLength));
  return { byteSize: buf.byteLength, mime: detectImageMime(head) };
}

function fetchAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uri, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      // file:// 응답은 status 가 0 또는 200 — 둘 다 정상으로 처리.
      if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
        const r = xhr.response;
        if (r instanceof ArrayBuffer) {
          resolve(r);
          return;
        }
        reject(new Error('XHR responseType=arraybuffer did not return ArrayBuffer'));
        return;
      }
      reject(new Error(`HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error(xhr.statusText || 'XHR error'));
    xhr.send();
  });
}

/**
 * 헤더 12 바이트로 이미지 mime 을 결정한다. 매직 시그니처:
 *
 *  - JPEG : `FF D8 FF`
 *  - PNG  : `89 50 4E 47`
 *  - WebP : `52 49 46 46 .. .. .. .. 57 45 42 50` ('RIFF' .. 'WEBP')
 *  - HEIC : `?? ?? ?? ?? 66 74 79 70 [heic|heix|heim|heis|mif1|msf1]`
 *           (ISO Base Media — 'ftyp' atom at offset 4, brand at offset 8)
 *
 * @returns 알려진 시그니처와 매칭되면 해당 mime, 아니면 null
 */
export function detectImageMime(head: Uint8Array): DetectedImageMime | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return 'image/jpeg';
  }
  if (head.length >= 4 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return 'image/png';
  }
  if (head.length >= 12
      && asciiAt(head, 0, 4) === 'RIFF'
      && asciiAt(head, 8, 4) === 'WEBP') {
    return 'image/webp';
  }
  if (head.length >= 12 && asciiAt(head, 4, 4) === 'ftyp') {
    const brand = asciiAt(head, 8, 4);
    if (brand === 'heic' || brand === 'heix' || brand === 'heim' || brand === 'heis'
        || brand === 'mif1' || brand === 'msf1') {
      return 'image/heic';
    }
  }
  return null;
}

function asciiAt(buf: Uint8Array, offset: number, length: number): string {
  let s = '';
  for (let i = 0; i < length && offset + i < buf.length; i++) {
    const byte = buf[offset + i];
    if (byte === undefined) break;
    s += String.fromCharCode(byte);
  }
  return s;
}
