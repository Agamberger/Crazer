import React from 'react';
import { render } from '@testing-library/react-native';
import TabLayout from '../_layout';
import { useOutingsStore } from '@/features/outings';

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

  test('doit réinitialiser la sélection de sortie au clic sur la tab index', () => {
    useOutingsStore.setState({ selectedOutingId: 'out-123' });

    const { getByTestId } = render(<TabLayout />);
    const indexScreen = getByTestId('tab-screen-index');
    const listeners = indexScreen.props.listeners;

    expect(listeners).toBeDefined();
    expect(typeof listeners.tabPress).toBe('function');

    listeners.tabPress();
    expect(useOutingsStore.getState().selectedOutingId).toBeNull();
  });
});
