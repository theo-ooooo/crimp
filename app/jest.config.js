module.exports = {
  preset: 'react-native',
  // (PR-A1, PR-F1) native 모듈을 import 하는 라이브러리는 jest 환경에 NativeEventEmitter
  // 가 없어 실 모듈 require 시 즉시 throw. 테스트가 직접 호출하지 않는 한 stub 으로
  // 대체 — 단순한 default/named export 형태면 충분.
  moduleNameMapper: {
    '^react-native-config$': '<rootDir>/jest.mocks/react-native-config.ts',
    '^@bam.tech/react-native-image-resizer$':
      '<rootDir>/jest.mocks/react-native-image-resizer.ts',
    '^react-native-compressor$': '<rootDir>/jest.mocks/react-native-compressor.ts',
    '^react-native-video$': '<rootDir>/jest.mocks/react-native-video.ts',
    // (PR-F1) compress.ts 자체를 no-op 으로 매핑 — measureFileBytes 가 fetch 를 호출해
    // 기존 upload.test 의 'fetch 호출 안 함' 단정과 충돌.
    // babel-plugin-module-resolver 가 import 를 상대경로로 바꿀 수 있어 두 패턴 모두 매핑.
    '^@/lib/media/compress$': '<rootDir>/jest.mocks/compress.ts',
    '.*src/lib/media/compress$': '<rootDir>/jest.mocks/compress.ts',
  },
};
