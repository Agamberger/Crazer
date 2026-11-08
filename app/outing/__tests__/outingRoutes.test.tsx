import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CreateOutingRoute from '../create';
import JoinOutingRoute from '../[id]/join';
import OutingRecapRoute from '../[id]/recap';

const mockSelectOuting = jest.fn();

/** Each feature screen renders one pressable text per callback so the route wiring can be tested. */
jest.mock('@/features/outings', () => {
  const { createElement, Fragment } = jest.requireActual('react');
  const { Text: MockText } = jest.requireActual('react-native');
  const screen =
    (prefix: string, describe: (props: Record<string, unknown>) => string) =>
    (props: Record<string, unknown>) =>
      createElement(
        Fragment,
        null,
        createElement(MockText, null, `${prefix}:${describe(props)}`),
        ...Object.entries(props)
          .filter(([, value]) => typeof value === 'function')
          .map(([name, fn]) =>
            createElement(
              MockText,
              { key: name, onPress: () => Reflect.apply(fn as never, undefined, ['new-outing']) },
              name,
            ),
          ),
      );
  return {
    CreateOutingWizard: screen('create', (props) => {
      const place = props.place as { id: string; name: string } | null;
      return place ? `${place.id}|${place.name}` : 'no-place';
    }),
    JoinOutingFlow: screen('join', (props) => String(props.outingId)),
    AvailabilityRecap: screen('recap', (props) => String(props.outingId)),
    useOutingsStore: (selector: (state: { selectOuting: jest.Mock }) => unknown) =>
      selector({ selectOuting: mockSelectOuting }),
  };
});

describe('outing routes', () => {
  const router = useRouter() as unknown as Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'o1' });
  });

  it('create : sans paramètre, aucun lieu n’est passé à l’assistant', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    const { getByText } = render(<CreateOutingRoute />);
    expect(getByText('create:no-place')).toBeTruthy();
  });

  it('create : placeId et placeName deviennent le lieu de l’assistant', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      placeId: 'place-uuid-1',
      placeName: 'Burger Gourmet',
    });
    const { getByText } = render(<CreateOutingRoute />);
    expect(getByText('create:place-uuid-1|Burger Gourmet')).toBeTruthy();
  });

  it('create : ouvre le récap de la sortie créée, ou revient en arrière', () => {
    const { getByText } = render(<CreateOutingRoute />);
    fireEvent.press(getByText('onCreated'));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/outing/[id]/recap',
      params: { id: 'new-outing' },
    });
    fireEvent.press(getByText('onClose'));
    expect(router.back).toHaveBeenCalled();
  });

  it('join : passe l’id et mène au récap après avoir rejoint', () => {
    const { getByText } = render(<JoinOutingRoute />);
    expect(getByText('join:o1')).toBeTruthy();
    fireEvent.press(getByText('onJoined'));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/outing/[id]/recap',
      params: { id: 'o1' },
    });
    fireEvent.press(getByText('onDeclined'));
    expect(router.back).toHaveBeenCalled();
  });

  it('recap : planifier sélectionne la sortie et ouvre l’onglet Sorties', () => {
    const { getByText } = render(<OutingRecapRoute />);
    expect(getByText('recap:o1')).toBeTruthy();
    fireEvent.press(getByText('onPlanned'));
    expect(mockSelectOuting).toHaveBeenCalledWith('o1');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/sorties');
  });

  it('recap : fermer sans historique ramène à l’onglet Sorties', () => {
    router.canGoBack.mockReturnValueOnce(false);
    const { getByText } = render(<OutingRecapRoute />);
    fireEvent.press(getByText('onClose'));
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/sorties');
  });
});
