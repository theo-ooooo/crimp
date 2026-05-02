// (PR-F1) jest 환경에서는 native 압축 라이브러리가 동작하지 않고, measureFileBytes 가
// fetch 를 부르면 기존 upload.test 의 'fetch 호출 0회' 단정과 충돌. no-op 으로 입력을
// 그대로 통과시킨다 — 실 디바이스 빌드에서는 src/lib/media/compress.ts 가 사용됨.
import type { CapturedMedia } from '@/lib/camera/types';

export async function compressCapturedMedia(captured: CapturedMedia): Promise<CapturedMedia> {
  return captured;
}
