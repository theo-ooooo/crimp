// react-native-config 1.6.1 부터 패키지 안의 react-native.config.js / package.json 의
// "react-native" 필드가 빠져 RN 0.75 의 autolink 가 platforms.android = null 로 판단,
// settings.gradle 의 autolinkLibrariesFromCommand 가 ':react-native-config' 를 등록하지
// 못해 Android 빌드가 line 7 에서 "Project with path ':react-native-config' could not be
// found" 로 실패한다. 직접 dependency override 로 sourceDir + packageImportPath 명시.
//
// iOS 는 cocoapods 가 react-native-config.podspec 으로 link 하므로 별도 명시 불필요.
module.exports = {
  dependencies: {
    'react-native-config': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-config/android',
          packageImportPath: 'import com.lugg.RNCConfig.RNCConfigPackage;',
          packageInstance: 'new RNCConfigPackage()',
        },
      },
    },
  },
};
