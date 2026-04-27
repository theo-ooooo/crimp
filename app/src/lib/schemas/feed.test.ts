import {
  DEFAULT_FEED_FILTER,
  FEED_FILTERS,
  FeedFilterSchema,
  FeedItemSchema,
  FeedListSchema,
} from './feed';

/**
 * Feed zod 스키마 파스 테스트.
 *
 * 백엔드 응답(`api/crimp-api/.../FeedItemResponse.java`) 와의 와이어 호환을 검증한다.
 * `@JsonInclude(NON_NULL)` 직렬화로 nullable 필드는 누락될 수 있으므로 두 케이스 모두
 * 통과해야 한다.
 */

describe('FeedFilterSchema', () => {
  it.each(['popular', 'friends', 'my-gym'] as const)('accepts %s', (v) => {
    expect(FeedFilterSchema.parse(v)).toBe(v);
  });

  it('rejects unknown values', () => {
    expect(() => FeedFilterSchema.parse('hot')).toThrow();
  });

  it('FEED_FILTERS contains all enum members', () => {
    // 길이는 enum 길이와 동일, 내용은 enum 의 부분집합.
    const enumValues = FeedFilterSchema.options;
    expect(FEED_FILTERS).toHaveLength(enumValues.length);
    for (const v of FEED_FILTERS) {
      expect(enumValues).toContain(v);
    }
  });

  it('DEFAULT_FEED_FILTER is a valid filter', () => {
    expect(() => FeedFilterSchema.parse(DEFAULT_FEED_FILTER)).not.toThrow();
  });
});

describe('FeedItemSchema', () => {
  const fullItem = {
    extId: '01J9ZX5K7YH4ZQ3VGABCDEF123',
    userExtId: '01J9ZX5K8000ABCDEFGHIJKLMN',
    userNickname: '서지우',
    avatarColorHue: 250,
    gymName: '서울볼더스 성수',
    result: 'SEND',
    gradeValue: 'V5',
    gradeNumeric: 5.0,
    holdColor: 'red',
    note: '드디어 V5 첫 완등!',
    likes: 24,
    comments: 6,
    loggedAt: '2026-04-25T07:00:00Z',
  };

  it('parses a full item', () => {
    const parsed = FeedItemSchema.parse(fullItem);
    expect(parsed.extId).toBe(fullItem.extId);
    expect(parsed.avatarColorHue).toBe(250);
    expect(parsed.gymName).toBe('서울볼더스 성수');
    expect(parsed.gradeNumeric).toBe(5);
  });

  it('parses an item where nullable keys are missing (NON_NULL serialization)', () => {
    // 백엔드는 null 필드 자체를 직렬화에서 제외 → 클라가 받는 JSON 에 키가 없을 수 있다.
    const partial = {
      extId: fullItem.extId,
      userExtId: fullItem.userExtId,
      userNickname: fullItem.userNickname,
      avatarColorHue: 0,
      result: 'TRY',
      likes: 0,
      comments: 0,
      loggedAt: fullItem.loggedAt,
    };
    const parsed = FeedItemSchema.parse(partial);
    expect(parsed.gymName).toBeUndefined();
    expect(parsed.gradeValue).toBeUndefined();
    expect(parsed.gradeNumeric).toBeUndefined();
    expect(parsed.holdColor).toBeUndefined();
    expect(parsed.note).toBeUndefined();
  });

  it('parses an item where nullable keys are explicit null', () => {
    const withNulls = {
      ...fullItem,
      gymName: null,
      gradeValue: null,
      gradeNumeric: null,
      holdColor: null,
      note: null,
    };
    const parsed = FeedItemSchema.parse(withNulls);
    expect(parsed.gymName).toBeNull();
    expect(parsed.gradeValue).toBeNull();
    expect(parsed.gradeNumeric).toBeNull();
    expect(parsed.holdColor).toBeNull();
    expect(parsed.note).toBeNull();
  });

  it('rejects out-of-range avatarColorHue', () => {
    expect(() =>
      FeedItemSchema.parse({ ...fullItem, avatarColorHue: -1 }),
    ).toThrow();
    expect(() =>
      FeedItemSchema.parse({ ...fullItem, avatarColorHue: 360 }),
    ).toThrow();
  });

  it('rejects unknown result enum', () => {
    expect(() =>
      FeedItemSchema.parse({ ...fullItem, result: 'PARTY' }),
    ).toThrow();
  });

  it('rejects negative likes/comments', () => {
    expect(() => FeedItemSchema.parse({ ...fullItem, likes: -1 })).toThrow();
    expect(() => FeedItemSchema.parse({ ...fullItem, comments: -1 })).toThrow();
  });
});

describe('FeedListSchema', () => {
  it('parses an empty page', () => {
    const list = FeedListSchema.parse({
      items: [],
      page: { nextCursor: null, size: 20 },
    });
    expect(list.items).toEqual([]);
    expect(list.page.nextCursor).toBeNull();
    expect(list.page.size).toBe(20);
  });

  it('parses a populated page with non-null cursor', () => {
    const list = FeedListSchema.parse({
      items: [
        {
          extId: 'X',
          userExtId: 'Y',
          userNickname: 'a',
          avatarColorHue: 180,
          result: 'FAIL',
          likes: 0,
          comments: 0,
          loggedAt: '2026-04-25T00:00:00Z',
        },
      ],
      page: { nextCursor: 12345, size: 20 },
    });
    expect(list.items).toHaveLength(1);
    expect(list.page.nextCursor).toBe(12345);
  });

  it('rejects when items array is missing', () => {
    expect(() =>
      FeedListSchema.parse({
        page: { nextCursor: null, size: 20 },
      }),
    ).toThrow();
  });
});
