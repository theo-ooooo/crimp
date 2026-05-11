import {
  CreateCrewBodySchema,
  CreateCrewJoinRequestBodySchema,
  CrewDetailSchema,
  CrewJoinRequestListSchema,
  CrewListSchema,
  CrewMemberListSchema,
} from './crew';

describe('crew schemas', () => {
  it('parses crew list and detail payloads', () => {
    const item = {
      extId: '01JCREW000000000000000000',
      name: '강남 퇴근볼더',
      summary: '평일 저녁',
      region: '서울 강남',
      homeGym: { extId: '01JGYM0000000000000000000', name: '더클라임 강남점' },
      levelBand: 'INTERMEDIATE',
      style: 'BOULDERING',
      memberCount: 18,
      capacity: 30,
      joinPolicy: 'APPROVAL',
      myStatus: 'PENDING',
    };

    const list = CrewListSchema.parse({
      items: [item],
      page: { nextCursor: 10, size: 20 },
    });
    expect(list.items[0]!.myStatus).toBe('PENDING');

    expect(CrewDetailSchema.parse({
      ...item,
      description: 'V3~V6 중심',
      owner: { extId: '01JOWNER0000000000000000', nickname: '크루장' },
      createdAt: '2026-05-08T00:00:00Z',
    }).owner.nickname).toBe('크루장');

    expect(CrewDetailSchema.parse({
      ...item,
      description: 'V3~V6 중심',
      owner: { extId: null, nickname: '탈퇴사용자' },
      createdAt: '2026-05-08T00:00:00Z',
    }).owner.extId).toBeNull();
  });

  it('parses join request and member lists', () => {
    const requests = CrewJoinRequestListSchema.parse({
      items: [{
        extId: '01JREQ0000000000000000000',
        applicant: { extId: '01JUSER00000000000000000', nickname: '신청자' },
        message: '가입하고 싶어요',
        status: 'PENDING',
        decidedBy: null,
        decidedAt: null,
        createdAt: '2026-05-08T00:00:00Z',
      }],
      page: { nextCursor: null, size: 20 },
    });

    expect(requests.items[0]!.status).toBe('PENDING');

    const members = CrewMemberListSchema.parse({
      items: [{
        userExtId: '01JUSER00000000000000000',
        nickname: '멤버',
        role: 'MEMBER',
        joinedAt: '2026-05-08T00:00:00Z',
      }],
      page: { nextCursor: null, size: 20 },
    });

    expect(members.items[0]!.role).toBe('MEMBER');
  });

  it('rejects unknown crew enum values', () => {
    expect(() => CrewListSchema.parse({
      items: [{
        extId: '01JCREW000000000000000000',
        name: '강남 퇴근볼더',
        summary: null,
        region: null,
        homeGym: null,
        levelBand: 'EXPERT',
        style: 'BOULDERING',
        memberCount: 1,
        capacity: null,
        joinPolicy: 'APPROVAL',
        myStatus: 'NONE',
      }],
      page: { nextCursor: null, size: 20 },
    })).toThrow();
  });

  it('validates crew write body constraints', () => {
    expect(CreateCrewBodySchema.parse({
      name: '강남 퇴근볼더',
      summary: '평일 저녁',
      description: 'V3~V6 중심',
      region: '서울 강남',
      homeGymExtId: `01J${'0'.repeat(23)}`,
      levelBand: 'INTERMEDIATE',
      style: 'BOULDERING',
      capacity: 30,
    }).capacity).toBe(30);

    expect(() => CreateCrewBodySchema.parse({
      name: '가',
      capacity: 1,
    })).toThrow();

    expect(() => CreateCrewBodySchema.parse({
      name: '강남 퇴근볼더',
      homeGymExtId: 'short',
    })).toThrow();
  });

  it('validates join request message length', () => {
    expect(CreateCrewJoinRequestBodySchema.parse({ message: null }).message).toBeNull();
    expect(() => CreateCrewJoinRequestBodySchema.parse({ message: 'a'.repeat(501) })).toThrow();
  });
});
