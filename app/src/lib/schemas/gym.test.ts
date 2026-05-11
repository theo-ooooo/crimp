import {
  GymRecentActivityItemSchema,
  GymRecentActivitySchema,
} from './gym';

describe('GymRecentActivitySchema', () => {
  const item = {
    userExtId: '01J9USR0000000000000000001',
    nickname: '서지우',
    avatarColorHue: 250,
    gradeValue: 'V5',
    result: 'SEND',
    loggedAt: '2026-05-04T01:00:00Z',
  };

  it('parses recent activity items', () => {
    const parsed = GymRecentActivitySchema.parse({ items: [item] });

    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.userExtId).toBe(item.userExtId);
  });

  it('parses deleted-user activity with null author id', () => {
    const parsed = GymRecentActivityItemSchema.parse({
      ...item,
      userExtId: null,
      nickname: '탈퇴사용자',
      avatarColorHue: 0,
    });

    expect(parsed.userExtId).toBeNull();
    expect(parsed.nickname).toBe('탈퇴사용자');
  });
});
