import { shouldInitializeProfileEditDraft } from './profileEditDraft';

describe('shouldInitializeProfileEditDraft', () => {
  it('initializes when the profile user is loaded first', () => {
    expect(shouldInitializeProfileEditDraft(null, 'user-1')).toBe(true);
  });

  it('does not reset draft fields for cache refreshes of the same user', () => {
    expect(shouldInitializeProfileEditDraft('user-1', 'user-1')).toBe(false);
  });

  it('initializes again when a different user is loaded', () => {
    expect(shouldInitializeProfileEditDraft('user-1', 'user-2')).toBe(true);
  });
});
