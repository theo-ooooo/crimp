import React from 'react';
import { act, create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { fetchGyms, fetchMe, startSession } from '@/lib/api';
import { useStartSessionScreen } from './useStartSessionScreen';

jest.mock('@/lib/api', () => ({
  fetchGyms: jest.fn(),
  fetchMe: jest.fn(),
  startSession: jest.fn(),
}));

const MAIN_GYM = {
  extId: '01JMAIN000000000000000001',
  name: '더클라임 강남',
  brand: '더클라임',
  address: '서울 강남구',
  lat: null,
  lng: null,
  rating: null,
  sendCount: 0,
  monthlyUserCount: 0,
  distanceMeters: null,
};

const OTHER_GYM = {
  extId: '01JOTHR00000000000000001',
  name: '볼더랩 성수',
  brand: '볼더랩',
  address: '서울 성동구',
  lat: null,
  lng: null,
  rating: null,
  sendCount: 0,
  monthlyUserCount: 0,
  distanceMeters: null,
};

type HookResult = ReturnType<typeof useStartSessionScreen>;
const cleanupFns: Array<() => void> = [];

describe('useStartSessionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchMe as jest.Mock).mockResolvedValue({
      extId: '01JUSER000000000000000001',
      mainGym: MAIN_GYM,
    });
    (fetchGyms as jest.Mock).mockResolvedValue({
      items: [OTHER_GYM],
      page: { nextCursor: null, size: 20 },
    });
    (startSession as jest.Mock).mockResolvedValue({
      extId: '01JSESS00000000000000001',
      gymId: 1,
      gymNameRaw: null,
      startedAt: '2026-05-03T00:00:00.000Z',
      endedAt: null,
      durationMin: null,
      note: null,
      condition: null,
    });
  });

  afterEach(() => {
    act(() => {
      while (cleanupFns.length > 0) {
        cleanupFns.pop()?.();
      }
    });
  });

  it('uses mainGym as the default selection', async () => {
    const { latest } = await renderHook();

    expect(latest.current.mainGym?.extId).toBe(MAIN_GYM.extId);
    expect(latest.current.activeGym?.extId).toBe(MAIN_GYM.extId);
    expect(latest.current.searchMode).toBe(false);
    expect(latest.current.canSubmit).toBe(true);
  });

  it('keeps route gym ahead of mainGym when opened from a gym detail', async () => {
    const routeGym = {
      gymExtId: '01JROUTE0000000000000001',
      gymName: '클라임파크 홍대',
    };
    const { latest } = await renderHook(routeGym);

    expect(latest.current.mainGym?.extId).toBe(MAIN_GYM.extId);
    expect(latest.current.activeGym?.extId).toBe(routeGym.gymExtId);
    expect(latest.current.selectedGymName).toBe(routeGym.gymName);
  });

  it('starts with the searched gym after switching to other gym', async () => {
    const { latest } = await renderHook();

    act(() => {
      latest.current.useOtherGym();
    });
    expect(latest.current.searchMode).toBe(true);
    expect(latest.current.activeGym).toBeNull();

    act(() => {
      latest.current.selectGym(OTHER_GYM);
    });
    expect(latest.current.activeGym?.extId).toBe(OTHER_GYM.extId);

    await act(async () => {
      latest.current.onSubmit();
      await flush();
    });

    expect(startSession).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({
        gymExtId: OTHER_GYM.extId,
        gymNameRaw: null,
      }),
    );
  });
});

async function renderHook(routeParams?: { gymExtId?: string; gymName?: string }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
      mutations: { gcTime: Infinity, retry: false },
    },
  });
  const latest: { current: HookResult } = {} as { current: HookResult };
  const navigation = {
    replace: jest.fn(),
    setParams: jest.fn(),
  };
  const route = { params: routeParams };

  function Harness(): JSX.Element {
    latest.current = useStartSessionScreen(
      'access-token',
      route as never,
      navigation as never,
    );
    return <></>;
  }

  await act(async () => {
    const renderer = create(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );
    cleanupFns.push(() => {
      renderer.unmount();
      queryClient.clear();
    });
  });
  await flushQueries();

  return { latest, navigation };
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function flushQueries(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await flush();
    });
  }
}
