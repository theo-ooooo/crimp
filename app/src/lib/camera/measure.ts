/**
 * 로컬 파일의 byte 크기를 측정한다 (PR #91, F5).
 *
 * vision-camera 의 takePhoto / onRecordingFinished 는 byteSize 를 직접 반환하지 않으므로,
 * 캡처 직후 본 함수로 정확한 크기를 구한다. 이 값이 후속 PR-3 의 presigned PUT 서명에
 * 박히기 때문에(PR #90 I2 — 다른 크기 PUT 시 S3 거부), 정확도가 중요하다.
 *
 * 구현: `fetch(uri).blob().size` — RN 의 fetch 는 file:// scheme 을 지원하며, blob 의 size
 * 는 실제 바이트 수다. react-native-fs 같은 추가 native 의존성 없이 동작.
 */
export async function measureFileBytes(uri: string): Promise<number> {
  const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
  const res = await fetch(fileUri);
  const blob = await res.blob();
  return blob.size;
}
