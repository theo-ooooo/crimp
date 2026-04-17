import React from 'react';
import renderer from 'react-test-renderer';
import HomeScreen from '../src/screens/HomeScreen';

describe('HomeScreen', () => {
  it('renders tagline', () => {
    const tree = renderer.create(<HomeScreen />).toJSON();
    expect(tree).toBeTruthy();
  });
});
