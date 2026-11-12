import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CreateOutingRoute from '../create';
import JoinOutingRoute from '../[id]/join';
import OutingRecapRoute from '../[id]/recap';
import OutingQuestionsRoute from '../[id]/questions';
import OutingActivitiesRoute from '../[id]/activities';
import OutingTieRoute from '../[id]/tie';

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
              { key: name, onPress: () =>
                  Reflect.apply(fn as never, undefined, [
                    name === 'onConvert' ? { activity: { title: 'Bowling' } } : 'new-outing',
                  ]) },
              name,
            ),
          ),
      );
  return {
    CreateOutingWizard: screen('create', (props) => {
      const place = props.place as { id: string; name: string } | null;
      const title = props.initialTitle ? `|title:${String(props.initialTitle)}` : '';
      return (place ? `${place.id}|${place.name}` : 'no-place') + title;
    }),
    JoinOutingFlow: screen('join', (props) => String(props.outingId)),
    AvailabilityRecap: screen('recap', (props) => String(props.outingId)),
    OutingQuestions: screen('questions', (props) => String(props.outingId)),
    ActivityVotes: screen('activities', (props) => String(props.outingId)),
    ActivityTieBreak: screen('tie', (props) => `${String(props.outingId)}|${String(props.day)}`),
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

  it('recap : continuer enchaîne vers les questions de la sortie sans la planifier', () => {
    const { getByText } = render(<OutingRecapRoute />);
    fireEvent.press(getByText('onContinue'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/outing/[id]/questions', params: { id: 'o1' } });
    expect(mockSelectOuting).not.toHaveBeenCalled();
  });

  it('recap : un membre peut répondre aux questions', () => {
    const { getByText } = render(<OutingRecapRoute />);
    fireEvent.press(getByText('onAnswerQuestions'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/outing/[id]/questions', params: { id: 'o1' } });
  });

  it('questions : une fois les réponses enregistrées, ouvre les activités et votes', () => {
    const { getByText } = render(<OutingQuestionsRoute />);
    expect(getByText('questions:o1')).toBeTruthy();
    fireEvent.press(getByText('onDone'));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/outing/[id]/activities',
      params: { id: 'o1' },
    });
  });

  it('create : le paramètre title devient le nom de départ de l’assistant', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ title: 'Bowling' });
    const { getByText } = render(<CreateOutingRoute />);
    expect(getByText('create:no-place|title:Bowling')).toBeTruthy();
  });

  it('activities : terminer ouvre la sortie dans l’onglet Sorties', () => {
    const { getByText } = render(<OutingActivitiesRoute />);
    expect(getByText('activities:o1')).toBeTruthy();
    fireEvent.press(getByText('onClose'));
    expect(mockSelectOuting).toHaveBeenCalledWith('o1');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/sorties');
  });

  it('activities : ouvre l’écran d’égalité du groupe', () => {
    const { getByText } = render(<OutingActivitiesRoute />);
    fireEvent.press(getByText('onOpenTie'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/outing/[id]/tie',
      params: { id: 'o1', day: 'new-outing' },
    });
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

  it('tie : transformer une activité ouvre l’assistant avec son titre', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'o1' });
    const { getByText } = render(<OutingTieRoute />);
    fireEvent.press(getByText('onConvert'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/outing/create', params: { title: 'Bowling' } });
  });

  it('activities : transformer une activité ouvre l’assistant avec son titre', () => {
    const { getByText } = render(<OutingActivitiesRoute />);
    fireEvent.press(getByText('onConvert'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/outing/create', params: { title: 'Bowling' } });
  });

  it('questions : fermer sans historique ramène à l’onglet Sorties', () => {
    router.canGoBack.mockReturnValueOnce(false);
    const { getByText } = render(<OutingQuestionsRoute />);
    fireEvent.press(getByText('onClose'));
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/sorties');
  });

  it('recap : fermer sans historique ramène à l’onglet Sorties', () => {
    router.canGoBack.mockReturnValueOnce(false);
    const { getByText } = render(<OutingRecapRoute />);
    fireEvent.press(getByText('onClose'));
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/sorties');
  });
});
