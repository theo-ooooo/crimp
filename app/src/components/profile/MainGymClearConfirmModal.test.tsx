import React from 'react';
import { act, create } from 'react-test-renderer';

import { MainGymClearConfirmModal } from './MainGymClearConfirmModal';

jest.mock('@/components/common/primitives', () => {
  const React = require('react');
  const { View } = require('react-native');
  const actual = jest.requireActual('@/components/common/primitives');
  return {
    ...actual,
    CrimpModal: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? <View>{children}</View> : null,
  };
});
jest.mock('@/lib/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

describe('MainGymClearConfirmModal', () => {
  it('calls confirm from the clear CTA', () => {
    const onConfirm = jest.fn();
    const renderer = create(
      <MainGymClearConfirmModal
        visible
        saving={false}
        errorMessage={null}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    const confirm = renderer.root.findByProps({ accessibilityLabel: '내 암장 해제' });
    act(() => {
      confirm.props.onPress();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls cancel from the cancel CTA', () => {
    const onCancel = jest.fn();
    const renderer = create(
      <MainGymClearConfirmModal
        visible
        saving={false}
        errorMessage={null}
        onCancel={onCancel}
        onConfirm={jest.fn()}
      />,
    );

    const cancel = renderer.root.findByProps({ accessibilityLabel: '취소' });
    act(() => {
      cancel.props.onPress();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables both actions while saving', () => {
    const renderer = create(
      <MainGymClearConfirmModal
        visible
        saving
        errorMessage={null}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

    expect(renderer.root.findByProps({ accessibilityLabel: '취소' }).props.disabled).toBe(true);
    expect(renderer.root.findByProps({ accessibilityLabel: '내 암장 해제' }).props.disabled).toBe(
      true,
    );
  });
});
