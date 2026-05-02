// (PR-F1) jest 환경에서 native bridge 가 없어 실 모듈 require 시 throw. 테스트는
// 압축 결과를 검증하지 않으므로 입력 그대로 통과시키는 sentinel:
// `size = Number.MAX_SAFE_INTEGER` 로 'compressed 가 더 큼' 분기를 타게 해 compress.ts
// 가 원본 captured 를 그대로 반환하게 만든다 (presign byteSize 가 변하지 않음).
export default {
  createResizedImage: async (uri: string) => ({
    uri,
    width: 0,
    height: 0,
    size: Number.MAX_SAFE_INTEGER,
    name: '',
  }),
};
