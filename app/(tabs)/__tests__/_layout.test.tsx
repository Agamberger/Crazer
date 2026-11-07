import React from 'react';
import { render } from '@testing-library/react-native';
import TabLayout from '../_layout';
import { useOutingsStore } from '@/features/outings';

describe('TabLayout Navbar Icons', () => {
  const tabs = ['index', 'sorties', 'carte', 'profil'];

  tabs.forEach((tabName) => {
    test(`doit définir un icon de navbar (tabBarIcon) pour la tab ${tabName}`, () => {
      const { getByTestId } = render(<TabLayout />);
      const screenElement = getByTestId(`tab-screen-${tabName}`);
      const options = screenElement.props.options;

      expect(options).toBeDefined();
      expect(typeof options.tabBarIcon).toBe('function');
    });
  });

  test('doit réinitialiser la sélection de sortie au clic sur la tab sorties', () => {
    useOutingsStore.setState({ selectedOutingId: 'out-123' });

    const { getByTestId } = render(<TabLayout />);
    const sortiesScreen = getByTestId('tab-screen-sorties');
    const listeners = sortiesScreen.props.listeners;

    expect(listeners).toBeDefined();
    expect(typeof listeners.tabPress).toBe('function');

    listeners.tabPress();
    expect(useOutingsStore.getState().selectedOutingId).toBeNull();
  });

  test("affiche l'accueil en premier, sans onglet Activités", () => {
    const { UNSAFE_root, queryByTestId } = render(<TabLayout />);
    const names = UNSAFE_root.findAll((node) => String(node.type) === 'Tabs.Screen').map(
      (node) => node.props.name
    );

    expect(names).toEqual(['index', 'sorties', 'carte', 'profil']);
    expect(getTitle(UNSAFE_root, 'index')).toBe('Accueil');
    expect(queryByTestId('tab-screen-activites')).toBeNull();
  });
});

const getTitle = (root: ReturnType<typeof render>['UNSAFE_root'], name: string): string =>
  root.findAll((node) => String(node.type) === 'Tabs.Screen' && node.props.name === name)[0].props.options
    .title;
