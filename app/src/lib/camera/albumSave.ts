import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

import type { CapturedMedia } from './types';

type CaptureAlbumModule = {
  saveToAlbum(uri: string, mime: CapturedMedia['mime']): Promise<string>;
};

function getCaptureAlbumModule(): CaptureAlbumModule {
  const nativeModule = NativeModules.CrimpCaptureAlbum as CaptureAlbumModule | undefined;
  if (!nativeModule?.saveToAlbum) {
    throw new Error('CrimpCaptureAlbum native module is unavailable');
  }
  return nativeModule;
}

export function saveCapturedMediaToAlbum(media: CapturedMedia): Promise<string> {
  return requestAlbumWritePermission().then(() =>
    getCaptureAlbumModule().saveToAlbum(media.uri, media.mime),
  );
}

async function requestAlbumWritePermission(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version > 28) {
    return;
  }
  const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE!;
  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) {
    return;
  }
  const result = await PermissionsAndroid.request(permission, {
    title: '앨범 저장 권한',
    message: '촬영한 사진/영상을 기기 앨범에 저장하려면 저장소 권한이 필요합니다.',
    buttonPositive: '허용',
    buttonNegative: '거부',
  });
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Album save permission denied');
  }
}
