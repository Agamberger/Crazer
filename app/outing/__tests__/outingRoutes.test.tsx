import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CreateOutingRoute from '../create';
import OutingHubRoute from '../[id]/index';
import JoinOutingRoute from '../[id]/join';
import OutingTieRoute from '../[id]/tie';
import OutingPlanningRoute from '../[id]/planning';

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
              {
                key: name,
                onPress: () =>
                  Reflect.apply(fn as never, undefined, [
                    name === 'onConvert' ? { activity: { title: 'Bowling' } } : 'new-outing',
                  ]),
              },
              name,
            ),
          ),
      );
  return {
    OutingHub: screen('hub', (props) => String(props.outingId)),
    CreateOutingScreen: screen('create', (props) => {
      const place = props.place as { id: string; name: string } | null;
      const title = props.initialTitle ? `|title:${String(props.initialTitle)}` : '';
      return (place ? `${place.id}|${place.name}` : 'no-place') + title;
    }),
    JoinOutingFlow: screen('join', (props) => String(props.outingId)),
    OutingPlanning: screen('planning', (props) => String(props.outingId)),
    ActivityTieBreak: screen('tie', (props) => `${String(props.outingId)}|${String(props.day)}`),
  };
});

describe('outing routes', () => {
  const router = useRouter() as unknown as Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'o1' });
  });

  it('create : sans paramètre, aucun lieu n’est passé à l’écran de création', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    const { getByText } = render(<CreateOutingRoute />);
    expect(getByText('create:no-place')).toBeTruthy();
  });

  it('create : placeId et placeName deviennent le lieu de l’écran de création', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      placeId: 'place-uuid-1',
      placeName: 'Burger Gourmet',
    });
    const { getByText } = render(<CreateOutingRoute />);
    expect(getByText('create:place-uuid-1|Burger Gourmet')).toBeTruthy();
  });

  it('create : ouvre le hub de la sortie créée, ou revient en arrière', () => {
    const { getByText } = render(<CreateOutingRoute />);
    fireEvent.press(getByText('onCreated'));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/outing/[id]',
      params: { id: 'new-outing' },
    });
    fireEvent.press(getByText('onClose'));
    expect(router.back).toHaveBeenCalled();
  });

  it('join : passe l’id et mène au hub après avoir rejoint', () => {
    const { getByText } = render(<JoinOutingRoute />);
    expect(getByText('join:o1')).toBeTruthy();
    fireEvent.press(getByText('onJoined'));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/outing/[id]',
      params: { id: 'o1' },
    });
    fireEvent.press(getByText('onDeclined'));
    expect(router.back).toHaveBeenCalled();
  });

  it('hub : passe l’id et ouvre l’égalité, le planning et une nouvelle sortie', () => {
    const { getByText } = render(<OutingHubRoute />);
    expect(getByText('hub:o1')).toBeTruthy();
    fireEvent.press(getByText('onOpenPlanning'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/outing/[id]/planning',
      params: { id: 'o1' },
    });
    fireEvent.press(getByText('onConvert'));
    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/outing/create' }),
    );
    fireEvent.press(getByText('onOpenTie'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/outing/[id]/tie',
      params: { id: 'o1', day: 'new-outing' },
    });
  });

  it('hub : fermer revient en arrière, sinon ouvre l’onglet Sorties', () => {
    const { getByText } = render(<OutingHubRoute />);
    fireEvent.press(getByText('onClose'));
    expect(router.back).toHaveBeenCalled();

    router.canGoBack.mockReturnValueOnce(false);
    fireEvent.press(getByText('onClose'));
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/sorties');
  });

  it('create : le paramètre title devient le nom de départ de l’écran de création', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ title: 'Bowling' });
    const { getByText } = render(<CreateOutingRoute />);
    expect(getByText('create:no-place|title:Bowling')).toBeTruthy();
  });

  it('tie : passe le jour (ou null) et revient en arrière', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'o1', day: '2026-11-10' });
    const { getByText, rerender } = render(<OutingTieRoute />);
    expect(getByText('tie:o1|2026-11-10')).toBeTruthy();
    fireEvent.press(getByText('onClose'));
    expect(router.back).toHaveBeenCalled();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'o1' });
    rerender(<OutingTieRoute />);
    expect(getByText('tie:o1|null')).toBeTruthy();
  });

  it('tie : transformer une activité ouvre l’écran de création avec son titre', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'o1' });
    const { getByText } = render(<OutingTieRoute />);
    fireEvent.press(getByText('onConvert'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/outing/create',
      params: { title: 'Bowling' },
    });
  });

  it('planning : terminer revient au hub, ou l’ouvre sans historique', () => {
    const { getByText } = render(<OutingPlanningRoute />);
    expect(getByText('planning:o1')).toBeTruthy();
    fireEvent.press(getByText('onClose'));
    expect(router.back).toHaveBeenCalled();

    router.canGoBack.mockReturnValueOnce(false);
    fireEvent.press(getByText('onClose'));
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/outing/[id]', params: { id: 'o1' } });
  });

  it('tie : fermer sans historique ouvre le hub', () => {
    router.canGoBack.mockReturnValueOnce(false);
    const { getByText } = render(<OutingTieRoute />);
    fireEvent.press(getByText('onClose'));
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/outing/[id]', params: { id: 'o1' } });
  });
});
