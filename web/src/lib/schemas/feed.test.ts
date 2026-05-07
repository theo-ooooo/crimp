import { describe, expect, it } from 'vitest';

import { CommentSchema, FeedItemSchema } from './feed';

describe('FeedItemSchema', () => {
  const item = {
    extId: '01J9ZX5K7YH4ZQ3VGABCDEF123',
    userExtId: '01J9ZX5K8000ABCDEFGHIJKLMN',
    userNickname: '서지우',
    avatarColorHue: 250,
    gymName: '서울볼더스 성수',
    result: 'SEND',
    gradeValue: 'V5',
    gradeNumeric: 5,
    holdColor: 'red',
    note: '완등',
    likes: 24,
    comments: 6,
    liked: false,
    loggedAt: '2026-04-25T07:00:00Z',
    mediaUrls: [],
  };

  it('parses deleted-user feed item with nullable author id', () => {
    const parsed = FeedItemSchema.parse({
      ...item,
      userExtId: null,
      userNickname: '탈퇴사용자',
      avatarColorHue: 0,
    });

    expect(parsed.userExtId).toBeNull();
    expect(parsed.userNickname).toBe('탈퇴사용자');
  });

  it('parses deleted-user feed item with omitted author id', () => {
    const { userExtId: _userExtId, ...withoutAuthorId } = item;

    const parsed = FeedItemSchema.parse({
      ...withoutAuthorId,
      userNickname: '탈퇴사용자',
      avatarColorHue: 0,
    });

    expect(parsed.userExtId).toBeUndefined();
  });
});

describe('CommentSchema', () => {
  const comment = {
    extId: '01J9CMTABCDEFGHIJKLMN0001',
    userExtId: '01J9USR0000000000000000001',
    userNickname: '도윤',
    avatarColorHue: 110,
    content: '축하해요!',
    createdAt: '2026-04-25T08:30:00Z',
    parentExtId: null,
  };

  it('parses deleted-user comment with nullable author id', () => {
    const parsed = CommentSchema.parse({
      ...comment,
      userExtId: null,
      userNickname: '탈퇴사용자',
      avatarColorHue: 0,
    });

    expect(parsed.userExtId).toBeNull();
    expect(parsed.userNickname).toBe('탈퇴사용자');
  });
});
