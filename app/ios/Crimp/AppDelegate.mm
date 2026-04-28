#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <kakao-login/RNKakaoLogins.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"Crimp";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

/**
 * Kakao SDK redirect 처리.
 *
 * 카카오 로그인 동의 후 `kakao${KAKAO_APP_KEY}://oauth?code=...` 로 redirect 되면
 * iOS 가 본 앱의 URL 스킴(Info.plist 의 CFBundleURLTypes) 에 매칭해 본 메서드를 호출한다.
 * `RNKakaoLogins.handleOpenUrl:` 가 SDK 내부 큐로 토큰 교환을 마무리.
 */
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options
{
  if ([RNKakaoLogins isKakaoTalkLoginUrl:url]) {
    return [RNKakaoLogins handleOpenUrl:url];
  }
  return NO;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
