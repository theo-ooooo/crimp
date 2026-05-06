import { videoDurationSecondsToMs } from './videoMeta';

jest.mock('react-native-compressor', () => ({
  getVideoMetaData: jest.fn(),
}));

describe('videoDurationSecondsToMs', () => {
  it('converts seconds to milliseconds', () => {
    expect(videoDurationSecondsToMs(123.456)).toBe(123456);
  });

  it('rejects invalid durations', () => {
    expect(videoDurationSecondsToMs(0)).toBeNull();
    expect(videoDurationSecondsToMs(-1)).toBeNull();
    expect(videoDurationSecondsToMs(Number.NaN)).toBeNull();
    expect(videoDurationSecondsToMs(null)).toBeNull();
  });
});
