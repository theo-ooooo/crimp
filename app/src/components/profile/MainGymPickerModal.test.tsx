import React from 'react';
import { act, create } from 'react-test-renderer';

import { useGymsQuery } from '@/hooks/queries/useGyms';

import { MainGymPickerModal } from './MainGymPickerModal';

jest.mock('@/hooks/queries/useGyms', () => ({
  useGymsQuery: jest.fn(),
}));
jest.mock('@/lib/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

const GYM = {
  extId: '01JGYM000000000000000001',
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

describe('MainGymPickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGymsQuery as jest.Mock).mockReturnValue({
      data: {
        pages: [
          {
            items: [GYM],
            page: { nextCursor: null, size: 20 },
          },
        ],
      },
      error: null,
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn().mockResolvedValue(undefined),
      fetchNextPage: jest.fn().mockResolvedValue(undefined),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
  });

  it('selects a row locally and saves only after confirm', () => {
    const onSelect = jest.fn();
    const renderer = create(
      <MainGymPickerModal
        visible
        currentGymExtId={null}
        saving={false}
        onClose={jest.fn()}
        onSelect={onSelect}
      />,
    );

    const row = renderer.root.findByProps({
      accessibilityLabel: '볼더랩 성수, 볼더랩, 서울 성동구',
    });
    act(() => {
      row.props.onPress();
    });

    expect(onSelect).not.toHaveBeenCalled();

    const confirm = renderer.root.findByProps({ accessibilityLabel: '확인' });
    act(() => {
      confirm.props.onPress();
    });

    expect(onSelect).toHaveBeenCalledWith(GYM);
  });

  it('keeps confirm disabled for the current gym', () => {
    const onSelect = jest.fn();
    const renderer = create(
      <MainGymPickerModal
        visible
        currentGymExtId={GYM.extId}
        saving={false}
        onClose={jest.fn()}
        onSelect={onSelect}
      />,
    );

    const confirm = renderer.root.findByProps({ accessibilityLabel: '확인' });

    expect(confirm.props.accessibilityState).toEqual({ disabled: true });
    act(() => {
      confirm.props.onPress();
    });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
