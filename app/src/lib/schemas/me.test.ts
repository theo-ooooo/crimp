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

describe('MeSchema', () => {
  const fullMe = {
    extId: '01J9USR0000000000000000001',
    nickname: '서지우',
    bio: '취미 클라이밍 1년차',
    levelSelf: 5,
    mainGymId: 1042,
    avatarMediaId: 99,
  };

  it('parses a fully-populated Me response', () => {
    const parsed = MeSchema.parse(fullMe);
    expect(parsed.extId).toBe(fullMe.extId);
    expect(parsed.nickname).toBe('서지우');
    expect(parsed.mainGymId).toBe(1042);
    expect(parsed.levelSelf).toBe(5);
  });

  it('parses a Me where nullable keys are explicit null', () => {
    const parsed = MeSchema.parse({
      ...fullMe,
      nickname: null,
      bio: null,
      levelSelf: null,
      mainGymId: null,
      avatarMediaId: null,
    });
    expect(parsed.nickname).toBeNull();
    expect(parsed.mainGymId).toBeNull();
  });

  it('parses a Me where nullable keys are omitted (NON_NULL serialization)', () => {
    // 백엔드는 null 필드 자체를 직렬화에서 제외 → 키 누락도 허용해야 한다.
    const parsed = MeSchema.parse({ extId: fullMe.extId });
    expect(parsed.extId).toBe(fullMe.extId);
    expect(parsed.nickname).toBeUndefined();
    expect(parsed.mainGymId).toBeUndefined();
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
});

describe('UpdateProfileBodySchema', () => {
  it('accepts an empty body (no-op)', () => {
    expect(() => UpdateProfileBodySchema.parse({})).not.toThrow();
  });

  it('accepts mainGymId as a positive integer', () => {
    const parsed = UpdateProfileBodySchema.parse({ mainGymId: 42 });
    expect(parsed.mainGymId).toBe(42);
  });

  it('accepts mainGymId as null (백엔드가 sentinel 도입 후 활성화 예정)', () => {
    const parsed = UpdateProfileBodySchema.parse({ mainGymId: null });
    expect(parsed.mainGymId).toBeNull();
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

  it('rejects unknown fields (strict)', () => {
    expect(() =>
      UpdateProfileBodySchema.parse({ unknownField: 'x' }),
    ).toThrow();
  });
});
