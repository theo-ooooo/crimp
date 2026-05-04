import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { StartSessionGymChoice } from '@/components/sessions/start/types';
import { toLocalInputValue } from '@/lib/datetime';
import type { GymItem } from '@/lib/schemas/gym';

import { useStartSessionForm } from './useStartSessionForm';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  mutation: {
    mutate: vi.fn(),
    isPending: false,
    error: null as Error | null,
  },
  meQuery: {
    data: null as
      | {
          mainGym?: {
            extId: string;
            name: string;
            brand?: string | null;
          } | null;
        }
      | null,
    isFetched: true,
  },
  gymQuery: {
    data: { pages: [{ items: [] as GymItem[] }] },
    isLoading: false,
    isFetchingNextPage: false,
    error: null as Error | null,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
}));

vi.mock('@/hooks/useSessions', () => ({
  useStartSession: () => mocks.mutation,
}));

vi.mock('@/hooks/useMe', () => ({
  useMeQuery: () => mocks.meQuery,
}));

vi.mock('@/hooks/useGyms', () => ({
  useGymsQuery: () => mocks.gymQuery,
}));

type HookResult = ReturnType<typeof useStartSessionForm>;

function renderUseStartSessionForm(
  routeGym: StartSessionGymChoice | null = null,
  resetKey: string | null = null,
) {
  let latest: HookResult | null = null;
  const container = document.createElement('div');
  let root: Root;

  function Probe({
    gym,
    startResetKey,
  }: {
    gym: StartSessionGymChoice | null;
    startResetKey: string | null;
  }) {
    latest = useStartSessionForm('token', gym, startResetKey);
    return null;
  }

  act(() => {
    root = createRoot(container);
    root.render(<Probe gym={routeGym} startResetKey={resetKey} />);
  });

  return {
    result: () => {
      if (!latest) {
        throw new Error('hook result is not ready');
      }
      return latest;
    },
    rerender: (
      nextRouteGym: StartSessionGymChoice | null,
      nextResetKey: string | null = resetKey,
    ) => {
      act(() => {
        root.render(
          <Probe gym={nextRouteGym} startResetKey={nextResetKey} />,
        );
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

const MAIN_GYM = {
  extId: 'gym-main',
  name: '메인 암장',
  brand: '메인',
} as const;

const ROUTE_GYM = {
  extId: 'gym-route',
  name: '라우트 암장',
  brand: '라우트',
} as const;

const SEARCH_GYM = {
  extId: 'gym-search',
  name: '검색 암장',
  brand: '검색',
  address: '서울특별시 강남구',
  lat: null,
  lng: null,
  rating: null,
  sendCount: 0,
  monthlyUserCount: 0,
} satisfies GymItem;

describe('useStartSessionForm', () => {
  beforeEach(() => {
    vi.useRealTimers();
    mocks.router.push.mockReset();
    mocks.router.replace.mockReset();
    mocks.mutation.mutate.mockReset();
    mocks.meQuery.data = null;
    mocks.meQuery.isFetched = true;
    mocks.gymQuery.data = { pages: [{ items: [] }] };
    mocks.gymQuery.isLoading = false;
    mocks.gymQuery.isFetchingNextPage = false;
    mocks.gymQuery.error = null;
    mocks.gymQuery.hasNextPage = false;
    mocks.gymQuery.fetchNextPage.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses main gym as the default selection', () => {
    mocks.meQuery.data = { mainGym: MAIN_GYM };

    const hook = renderUseStartSessionForm();

    expect(hook.result().gymChoice.activeGym).toEqual(MAIN_GYM);
    expect(hook.result().gymChoice.mode).toBe('selected');

    hook.unmount();
  });

  it('clears route gym query when switching to other gym search', () => {
    mocks.meQuery.data = { mainGym: MAIN_GYM };

    const hook = renderUseStartSessionForm(ROUTE_GYM);

    expect(hook.result().gymChoice.activeGym).toEqual(ROUTE_GYM);

    act(() => {
      hook.result().gymActions.onUseOtherGym();
    });

    expect(mocks.router.replace).toHaveBeenCalledWith('/sessions/new');
    expect(hook.result().gymChoice.activeGym).toBeNull();
    expect(hook.result().gymChoice.mode).toBe('search');

    hook.unmount();
  });

  it('resets start time when route gym changes', () => {
    const firstNow = new Date(2026, 4, 4, 10, 0);
    const secondNow = new Date(2026, 4, 4, 11, 15);
    vi.useFakeTimers();
    vi.setSystemTime(firstNow);

    const hook = renderUseStartSessionForm(ROUTE_GYM);

    expect(hook.result().startedAtLocal).toBe(toLocalInputValue(firstNow));

    act(() => {
      hook.result().onStartedAtChange('2026-05-01T09:00');
    });
    expect(hook.result().startedAtLocal).toBe('2026-05-01T09:00');

    vi.setSystemTime(secondNow);
    hook.rerender({
      ...ROUTE_GYM,
      extId: 'gym-route-next',
      name: '다음 라우트 암장',
    });

    expect(hook.result().startedAtLocal).toBe(toLocalInputValue(secondNow));

    hook.unmount();
  });

  it('resets start time when start reset key changes for the same route gym', () => {
    const firstNow = new Date(2026, 4, 4, 10, 0);
    const secondNow = new Date(2026, 4, 4, 10, 45);
    vi.useFakeTimers();
    vi.setSystemTime(firstNow);

    const hook = renderUseStartSessionForm(ROUTE_GYM, 'first');

    act(() => {
      hook.result().onStartedAtChange('2026-05-01T09:00');
    });

    vi.setSystemTime(secondNow);
    hook.rerender(ROUTE_GYM, 'second');

    expect(hook.result().startedAtLocal).toBe(toLocalInputValue(secondNow));

    hook.unmount();
  });

  it('resets start time when selecting a searched gym', () => {
    const selectedAt = new Date(2026, 4, 4, 12, 30);
    vi.useFakeTimers();

    const hook = renderUseStartSessionForm();

    act(() => {
      hook.result().onStartedAtChange('2026-05-01T09:00');
    });
    vi.setSystemTime(selectedAt);
    act(() => {
      hook.result().gymActions.onSelectGym(SEARCH_GYM);
    });

    expect(hook.result().startedAtLocal).toBe(toLocalInputValue(selectedAt));

    hook.unmount();
  });

  it('submits the selected search gym and navigates to the created session', () => {
    mocks.mutation.mutate.mockImplementation((_payload, options) => {
      options?.onSuccess?.({ extId: 'session-created' });
    });

    const hook = renderUseStartSessionForm();

    act(() => {
      hook.result().gymActions.onSelectGym(SEARCH_GYM);
    });
    act(() => {
      hook.result().submit.onSubmit({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>);
    });

    expect(mocks.mutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        gymExtId: SEARCH_GYM.extId,
        gymNameRaw: null,
      }),
      expect.any(Object),
    );
    expect(mocks.router.push).toHaveBeenCalledWith('/sessions/session-created');

    hook.unmount();
  });
});
