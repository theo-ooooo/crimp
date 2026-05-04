import { gymRecentActivityQueryKey } from './useGyms';

describe('gymRecentActivityQueryKey', () => {
  it('includes the requested size in the query key', () => {
    expect(gymRecentActivityQueryKey('gym-123', 6)).toEqual([
      'gym',
      'gym-123',
      'recent-activity',
      6,
    ]);
  });

  it('keeps size null when omitted', () => {
    expect(gymRecentActivityQueryKey('gym-123')).toEqual([
      'gym',
      'gym-123',
      'recent-activity',
      null,
    ]);
  });
});
