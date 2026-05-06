#import <Foundation/Foundation.h>
#import <Photos/Photos.h>
#import <React/RCTBridgeModule.h>

@interface CrimpCaptureAlbum : NSObject <RCTBridgeModule>
@end

@interface CrimpCaptureAlbum ()
+ (NSURL *)fileURLFromURI:(NSString *)uri;
+ (BOOL)isAllowedStatus:(PHAuthorizationStatus)status;
+ (void)saveFileURL:(NSURL *)fileURL
               mime:(NSString *)mime
           resolver:(RCTPromiseResolveBlock)resolve
           rejecter:(RCTPromiseRejectBlock)reject;
@end

@implementation CrimpCaptureAlbum

RCT_EXPORT_MODULE(CrimpCaptureAlbum)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(saveToAlbum:(NSString *)uri
                  mime:(NSString *)mime
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *fileURL = [CrimpCaptureAlbum fileURLFromURI:uri];
  if (fileURL == nil) {
    reject(@"invalid-uri", @"Cannot resolve capture file URI", nil);
    return;
  }

  void (^saveBlock)(void) = ^{
    [CrimpCaptureAlbum saveFileURL:fileURL mime:mime resolver:resolve rejecter:reject];
  };

  if (@available(iOS 14, *)) {
    PHAuthorizationStatus status = [PHPhotoLibrary authorizationStatusForAccessLevel:PHAccessLevelAddOnly];
    if ([CrimpCaptureAlbum isAllowedStatus:status]) {
      saveBlock();
      return;
    }
    [PHPhotoLibrary requestAuthorizationForAccessLevel:PHAccessLevelAddOnly handler:^(PHAuthorizationStatus newStatus) {
      if ([CrimpCaptureAlbum isAllowedStatus:newStatus]) {
        saveBlock();
      } else {
        reject(@"permission-denied", @"Photo library add permission denied", nil);
      }
    }];
    return;
  }

  PHAuthorizationStatus status = [PHPhotoLibrary authorizationStatus];
  if ([CrimpCaptureAlbum isAllowedStatus:status]) {
    saveBlock();
    return;
  }
  [PHPhotoLibrary requestAuthorization:^(PHAuthorizationStatus newStatus) {
    if ([CrimpCaptureAlbum isAllowedStatus:newStatus]) {
      saveBlock();
    } else {
      reject(@"permission-denied", @"Photo library permission denied", nil);
    }
  }];
}

+ (NSURL *)fileURLFromURI:(NSString *)uri
{
  if (uri.length == 0) {
    return nil;
  }
  if ([uri hasPrefix:@"file://"]) {
    return [NSURL URLWithString:uri];
  }
  return [NSURL fileURLWithPath:uri];
}

+ (BOOL)isAllowedStatus:(PHAuthorizationStatus)status
{
  if (status == PHAuthorizationStatusAuthorized) {
    return YES;
  }
  if (@available(iOS 14, *)) {
    return status == PHAuthorizationStatusLimited;
  }
  return NO;
}

+ (void)saveFileURL:(NSURL *)fileURL
               mime:(NSString *)mime
           resolver:(RCTPromiseResolveBlock)resolve
           rejecter:(RCTPromiseRejectBlock)reject
{
  BOOL isVideo = [mime hasPrefix:@"video/"];
  BOOL isImage = [mime hasPrefix:@"image/"];
  if (!isVideo && !isImage) {
    reject(@"unsupported-media", @"Unsupported capture media type", nil);
    return;
  }

  __block NSString *localIdentifier = nil;
  [[PHPhotoLibrary sharedPhotoLibrary] performChanges:^{
    PHAssetChangeRequest *request = nil;
    if (isVideo) {
      request = [PHAssetChangeRequest creationRequestForAssetFromVideoAtFileURL:fileURL];
    } else {
      request = [PHAssetChangeRequest creationRequestForAssetFromImageAtFileURL:fileURL];
    }
    localIdentifier = request.placeholderForCreatedAsset.localIdentifier;
  } completionHandler:^(BOOL success, NSError *error) {
    if (success) {
      resolve(localIdentifier ?: @"");
    } else {
      reject(@"save-failed", error.localizedDescription ?: @"Album save failed", error);
    }
  }];
}

@end
