module.exports = {
  preset: 'react-native',
  // (PR-A1) react-native-config 가 ES export 를 그대로 노출 → jest 의 기본
  // transformIgnorePatterns 가 node_modules 를 babel 변환에서 제외해 SyntaxError.
  // 테스트는 native 환경 없이 도므로 stub 으로 대체.
  moduleNameMapper: {
    '^react-native-config$': '<rootDir>/jest.mocks/react-native-config.ts',
  },
};
