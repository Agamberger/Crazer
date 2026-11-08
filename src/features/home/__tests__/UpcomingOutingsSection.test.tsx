import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { OutingRow } from '@/shared/types';
import { UpcomingOutingsSection } from '../components/UpcomingOutingsSection';

const makeOuting = (id: string, title: string, start: Date): OutingRow => ({
  id,
  title,
  description: null,
  start_date: start.toISOString(),
  created_by: 'alice',
  status: 'planned',
  cover_image: null,
  outing_type: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('UpcomingOutingsSection', () => {
  const outings = [
    makeOuting('a', 'Ciné', new Date(2026, 10, 11, 18, 0)),
    makeOuting('b', 'Rooftop', new Date(2026, 10, 12, 20, 30)),
  ];

  test('ne rend rien sans sortie à venir', () => {
    const { toJSON } = render(
      <UpcomingOutingsSection outings={[]} onOpenOuting={jest.fn()} onCreateOuting={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  test('affiche « Date à définir » pour une sortie sans date', () => {
    const undated: OutingRow = { ...outings[0], id: 'u', title: 'Brunch', start_date: null };
    const { getByText } = render(
      <UpcomingOutingsSection outings={[undated]} onOpenOuting={jest.fn()} onCreateOuting={jest.fn()} />
    );
    expect(getByText('Date à définir')).toBeTruthy();
  });

  test('liste les sorties avec leur date et ouvre celle choisie', () => {
    const onOpen = jest.fn();
    const { getByText, getByTestId } = render(
      <UpcomingOutingsSection outings={outings} onOpenOuting={onOpen} onCreateOuting={jest.fn()} />
    );

    expect(getByText('À venir')).toBeTruthy();
    expect(getByText('Ciné')).toBeTruthy();
    expect(getByText(/18:00$/)).toBeTruthy();

    fireEvent.press(getByTestId('home-upcoming-b'));
    expect(onOpen).toHaveBeenCalledWith(outings[1]);
  });

  test('« + Sortie » déclenche la création', () => {
    const onCreate = jest.fn();
    const { getByText } = render(
      <UpcomingOutingsSection outings={outings} onOpenOuting={jest.fn()} onCreateOuting={onCreate} />
    );
    fireEvent.press(getByText('+ Sortie'));
    expect(onCreate).toHaveBeenCalled();
  });
});
