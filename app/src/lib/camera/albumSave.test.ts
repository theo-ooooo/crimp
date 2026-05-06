import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

import { saveCapturedMediaToAlbum } from './albumSave';
import type { CapturedMedia } from './types';

const media: CapturedMedia = {
  kind: 'IMAGE',
  uri: 'file:///tmp/capture.jpg',
  mime: 'image/jpeg',
  byteSize: 123,
  width: 100,
  height: 100,
  durationMs: null,
};

describe('saveCapturedMediaToAlbum', () => {
  const originalModule = NativeModules.CrimpCaptureAlbum;
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  afterEach(() => {
    NativeModules.CrimpCaptureAlbum = originalModule;
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    Object.defineProperty(Platform, 'Version', { value: originalVersion });
    jest.restoreAllMocks();
  });

  it('delegates uri and mime to the native album module', async () => {
    const saveToAlbum = jest.fn().mockResolvedValue('content://media/1');
    NativeModules.CrimpCaptureAlbum = { saveToAlbum };

    await expect(saveCapturedMediaToAlbum(media)).resolves.toBe('content://media/1');
    expect(saveToAlbum).toHaveBeenCalledWith('file:///tmp/capture.jpg', 'image/jpeg');
  });

  it('throws when the native module is not registered', async () => {
    NativeModules.CrimpCaptureAlbum = undefined;

    await expect(saveCapturedMediaToAlbum(media)).rejects.toThrow(
      'CrimpCaptureAlbum native module is unavailable',
    );
  });

  it('requests legacy Android storage permission before saving', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    Object.defineProperty(Platform, 'Version', { value: 28 });
    const check = jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    const request = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED!);
    const saveToAlbum = jest.fn().mockResolvedValue('content://media/1');
    NativeModules.CrimpCaptureAlbum = { saveToAlbum };

    await saveCapturedMediaToAlbum(media);

    expect(check).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
    expect(request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      expect.objectContaining({ title: '앨범 저장 권한' }),
    );
    expect(saveToAlbum).toHaveBeenCalledWith(media.uri, media.mime);
  });

  it('rejects when legacy Android storage permission is denied', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    Object.defineProperty(Platform, 'Version', { value: 28 });
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED!);
    const saveToAlbum = jest.fn();
    NativeModules.CrimpCaptureAlbum = { saveToAlbum };

    await expect(saveCapturedMediaToAlbum(media)).rejects.toThrow(
      'Album save permission denied',
    );
    expect(saveToAlbum).not.toHaveBeenCalled();
  });
});
