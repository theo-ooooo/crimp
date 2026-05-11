import { navigateHomeAfterSessionEnd } from './sessionEndNavigation';

describe('navigateHomeAfterSessionEnd', () => {
  it('resets the current stack and targets the Home tab root', () => {
    const parent = { navigate: jest.fn() };
    const navigation = {
      popToTop: jest.fn(),
      getParent: jest.fn(() => parent),
    };

    navigateHomeAfterSessionEnd(navigation as never);

    expect(navigation.popToTop).toHaveBeenCalledTimes(1);
    expect(navigation.getParent).toHaveBeenCalledTimes(1);
    expect(parent.navigate).toHaveBeenCalledWith('HomeTab', { screen: 'Home' });
  });

  it('does not throw when the tab parent is missing', () => {
    const navigation = {
      popToTop: jest.fn(),
      getParent: jest.fn(() => undefined),
    };

    expect(() => navigateHomeAfterSessionEnd(navigation as never)).not.toThrow();
    expect(navigation.popToTop).toHaveBeenCalledTimes(1);
  });
});
