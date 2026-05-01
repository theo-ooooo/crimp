#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <RNBootSplash.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"Crimp";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// [PR-S1] 부모 RCTAppDelegate 가 호출하는 customize 훅에서 BootSplash storyboard 를 띄운다.
// JS 가 BootSplash.hide() 를 부를 때까지 native 스플래시가 그대로 유지된다.
- (void)customizeRootView:(RCTRootView *)rootView
{
  [super customizeRootView:rootView];
  [RNBootSplash initWithStoryboard:@"BootSplash" rootView:rootView];
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
