import { getVideoMetaData } from 'react-native-compressor';

export function videoDurationSecondsToMs(durationSeconds: number | null | undefined): number | null {
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }
  return Math.max(1, Math.round(durationSeconds * 1000));
}

export async function readVideoDurationMs(uri: string): Promise<number | null> {
  const meta = await getVideoMetaData(uri);
  return videoDurationSecondsToMs(meta.duration);
}
