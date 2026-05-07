import { MeSchema, UpdateProfileBodySchema } from './me';

/**
 * Me / UpdateProfileBody zod 스키마 테스트.
 *
 * 백엔드 응답(`api/crimp-api/.../UserController.MeResponse`) 와의 와이어 호환을 검증한다.
 * `@JsonInclude(NON_NULL)` 직렬화로 nullable 필드는 누락될 수 있으므로 두 케이스 모두
 * 통과해야 한다.
 *
 * 참고: 앱의 jest preset 자체가 미설정 상태(F1) 라 본 파일은 직접 실행되지 않을 수
 * 있으나, 동일 컨벤션으로 작성해 후속 PR 에서 jest 가 활성화되면 즉시 동작하도록 둔다.
 */

const VALID_GYM_EXT_ID = '01J9USR0000000000000000099'; // 26자 ULID 형태

describe('MeSchema', () => {
  const fullMe = {
    extId: '01J9USR0000000000000000001',
    nickname: '서지우',
    nicknameConfigured: true,
    bio: '취미 클라이밍 1년차',
    levelSelf: 5,
    mainGymId: 1042,
    mainGym: {
      extId: VALID_GYM_EXT_ID,
      name: '클라임파크 강남점',
      brand: '클라임파크',
    },
    avatarMediaId: 99,
    avatarUrl: 'https://cdn.crimp.test/media/users/1/image/avatar.webp',
  };

  it('parses a fully-populated Me response', () => {
    const parsed = MeSchema.parse(fullMe);
    expect(parsed.extId).toBe(fullMe.extId);
    expect(parsed.nickname).toBe('서지우');
    expect(parsed.nicknameConfigured).toBe(true);
    expect(parsed.mainGymId).toBe(1042);
    expect(parsed.mainGym?.extId).toBe(VALID_GYM_EXT_ID);
    expect(parsed.mainGym?.name).toBe('클라임파크 강남점');
    expect(parsed.mainGym?.brand).toBe('클라임파크');
    expect(parsed.levelSelf).toBe(5);
    expect(parsed.avatarUrl).toBe(fullMe.avatarUrl);
  });

  it('parses a Me where nullable keys are explicit null', () => {
    const parsed = MeSchema.parse({
      ...fullMe,
      nickname: null,
      bio: null,
      levelSelf: null,
      mainGymId: null,
      mainGym: null,
      avatarMediaId: null,
      avatarUrl: null,
    });
    expect(parsed.nickname).toBeNull();
    expect(parsed.mainGymId).toBeNull();
    expect(parsed.mainGym).toBeNull();
  });

  it('parses a Me where nullable keys are omitted (NON_NULL serialization)', () => {
    // 백엔드는 null 필드 자체를 직렬화에서 제외 → 키 누락도 허용해야 한다.
    const parsed = MeSchema.parse({ extId: fullMe.extId });
    expect(parsed.extId).toBe(fullMe.extId);
    expect(parsed.nickname).toBeUndefined();
    expect(parsed.nicknameConfigured).toBe(false);
    expect(parsed.mainGymId).toBeUndefined();
    expect(parsed.mainGym).toBeUndefined();
  });

  it('parses a mainGym whose brand key is omitted (브랜드 미등록 암장 + NON_NULL)', () => {
    // I5: 브랜드가 null 인 암장은 응답에서 brand 키 자체가 누락된다.
    const parsed = MeSchema.parse({
      ...fullMe,
      mainGym: {
        extId: VALID_GYM_EXT_ID,
        name: '동네 작은 암장',
      },
    });
    expect(parsed.mainGym?.extId).toBe(VALID_GYM_EXT_ID);
    expect(parsed.mainGym?.brand).toBeUndefined();
  });

  it('parses a mainGym whose brand is explicit null', () => {
    const parsed = MeSchema.parse({
      ...fullMe,
      mainGym: {
        extId: VALID_GYM_EXT_ID,
        name: '동네 작은 암장',
        brand: null,
      },
    });
    expect(parsed.mainGym?.brand).toBeNull();
  });

  it('rejects out-of-range levelSelf (Byte 범위 위반)', () => {
    expect(() => MeSchema.parse({ ...fullMe, levelSelf: 200 })).toThrow();
    expect(() => MeSchema.parse({ ...fullMe, levelSelf: -200 })).toThrow();
  });

  it('rejects when extId is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { extId, ...rest } = fullMe;
    expect(() => MeSchema.parse(rest)).toThrow();
  });

  it('rejects mainGym missing required name', () => {
    expect(() =>
      MeSchema.parse({
        ...fullMe,
        mainGym: { extId: VALID_GYM_EXT_ID },
      }),
    ).toThrow();
  });
});

describe('UpdateProfileBodySchema', () => {
  it('accepts an empty body (no-op)', () => {
    expect(() => UpdateProfileBodySchema.parse({})).not.toThrow();
  });

  it('accepts mainGymExtId as a 26-char ULID', () => {
    const parsed = UpdateProfileBodySchema.parse({
      mainGymExtId: VALID_GYM_EXT_ID,
    });
    expect(parsed.mainGymExtId).toBe(VALID_GYM_EXT_ID);
  });

  it('accepts clearMainGym=true', () => {
    const parsed = UpdateProfileBodySchema.parse({ clearMainGym: true });
    expect(parsed.clearMainGym).toBe(true);
  });

  it('accepts clearAvatar=true', () => {
    const parsed = UpdateProfileBodySchema.parse({ clearAvatar: true });
    expect(parsed.clearAvatar).toBe(true);
  });

  it('rejects clearAvatar=true combined with avatarMediaId', () => {
    expect(() =>
      UpdateProfileBodySchema.parse({
        clearAvatar: true,
        avatarMediaId: 1,
      }),
    ).toThrow();
  });

  it('rejects clearMainGym=true combined with mainGymExtId (백엔드 INVALID_MAIN_GYM_REQUEST 사전 차단)', () => {
    expect(() =>
      UpdateProfileBodySchema.parse({
        clearMainGym: true,
        mainGymExtId: VALID_GYM_EXT_ID,
      }),
    ).toThrow();
  });

  it('rejects clearMainGym=true combined with mainGymId', () => {
    expect(() =>
      UpdateProfileBodySchema.parse({
        clearMainGym: true,
        mainGymId: 1,
      }),
    ).toThrow();
  });

  it('rejects mainGymExtId shorter than 26 chars', () => {
    expect(() =>
      UpdateProfileBodySchema.parse({ mainGymExtId: 'X' }),
    ).toThrow();
  });

  it('rejects mainGymExtId longer than 26 chars', () => {
    expect(() =>
      UpdateProfileBodySchema.parse({ mainGymExtId: 'X'.repeat(27) }),
    ).toThrow();
  });

  it('still accepts legacy mainGymId path (backend 호환)', () => {
    const parsed = UpdateProfileBodySchema.parse({ mainGymId: 42 });
    expect(parsed.mainGymId).toBe(42);
  });

  it('rejects nickname shorter than 2 chars', () => {
    expect(() => UpdateProfileBodySchema.parse({ nickname: 'a' })).toThrow();
  });

  it('rejects nickname longer than 30 chars', () => {
    expect(() =>
      UpdateProfileBodySchema.parse({ nickname: 'x'.repeat(31) }),
    ).toThrow();
  });

  it('rejects bio longer than 300 chars', () => {
    expect(() =>
      UpdateProfileBodySchema.parse({ bio: 'x'.repeat(301) }),
    ).toThrow();
  });

  it('accepts clearing bio with an empty string', () => {
    const parsed = UpdateProfileBodySchema.parse({ bio: '' });
    expect(parsed.bio).toBe('');
  });

  it('accepts V-scale UI boundary values for levelSelf', () => {
    expect(UpdateProfileBodySchema.parse({ levelSelf: 0 }).levelSelf).toBe(0);
    expect(UpdateProfileBodySchema.parse({ levelSelf: 12 }).levelSelf).toBe(12);
  });

  it('accepts sparse profile field updates', () => {
    expect(UpdateProfileBodySchema.parse({ nickname: 'crimper' })).toEqual({
      nickname: 'crimper',
    });
    expect(UpdateProfileBodySchema.parse({ levelSelf: 7 })).toEqual({
      levelSelf: 7,
    });
  });

  it('rejects unknown fields (strict)', () => {
    expect(() =>
      UpdateProfileBodySchema.parse({ unknownField: 'x' }),
    ).toThrow();
  });
});
