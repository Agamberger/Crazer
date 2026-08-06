import React from 'react';
import { render } from '@testing-library/react-native';
import TabLayout from '../_layout';

describe('TabLayout Navbar Icons', () => {
  const tabs = ['index', 'activites', 'carte', 'profil'];

  tabs.forEach((tabName) => {
    test(`doit définir un icon de navbar (tabBarIcon) pour la tab ${tabName}`, () => {
      const { getByTestId } = render(<TabLayout />);
      const screenElement = getByTestId(`tab-screen-${tabName}`);
      const options = screenElement.props.options;

      expect(options).toBeDefined();
      expect(typeof options.tabBarIcon).toBe('function');
    });
  });
});
