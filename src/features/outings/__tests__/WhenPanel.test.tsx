import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { OutingRow } from '@/shared/types';
import { WhenPanel, WhenPanelProps } from '../components/hub/WhenPanel';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { DayRecap, OutingMember, OutingScheduling } from '../types/scheduling';
import { buildStartDate, DEFAULT_TIME_RANGE, toDayKey } from '../utils/availabilityUtils';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));

const OUTING: OutingRow = {
  id: 'o1',
  title: 'Glouglou',
  description: null,
  start_date: null,
  created_by: 'alice',
  status: 'draft',
  cover_image: null,
  outing_type: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

const DAY_1 = '2099-06-10';
const DAY_2 = '2099-06-11';

const member = (userId: string, status: OutingMember['status']): OutingMember => ({
  userId,
  displayName: userId.toUpperCase(),
  avatarUrl: null,
  status,
  isOrganizer: userId === 'alice',
});

const SCHEDULING: OutingScheduling = {
  days: [DAY_1, DAY_2],
  availabilities: [{ userId: 'alice', day: DAY_1, start: '18:00', end: '23:00' }],
  members: [member('alice', 'accepted'), member('bob', 'accepted'), member('charlie', 'invited')],
};

const RECAPS: DayRecap[] = [
  {
    day: DAY_1,
    availableMembers: [member('alice', 'accepted')],
    commonSlot: { start: '18:00', end: '23:00' },
  },
  { day: DAY_2, availableMembers: [], commonSlot: null },
];

const saveDays = jest.fn();
const saveMySlots = jest.fn();
const updateOuting = jest.fn();
const onClose = jest.fn();

const renderPanel = (overrides: Partial<WhenPanelProps> = {}) =>
  render(
    <WhenPanel
      visible
      onClose={onClose}
      outing={OUTING}
      scheduling={SCHEDULING}
      recaps={RECAPS}
      pendingCount={0}
      userId="alice"
      isOrganizer
      {...overrides}
    />,
  );

beforeEach(() => {
  jest.clearAllMocks();
  useOutingSchedulingStore.setState({ saveDays, saveMySlots, isSubmitting: false });
  useOutingsStore.setState({ updateOuting });
  saveDays.mockResolvedValue(undefined);
  saveMySlots.mockResolvedValue(undefined);
});

describe('WhenPanel', () => {
  it('l’organisateur voit le calendrier, ses dispos et le récap par jour', () => {
    const { getByTestId, getByText } = renderPanel();
    expect(getByTestId('when-calendar')).toBeTruthy();
    expect(getByTestId(`my-slot-${DAY_1}-start`)).toBeTruthy();
    expect(getByText('Créneau commun par jour')).toBeTruthy();
    expect(getByTestId(`btn-choose-day-${DAY_1}`)).toBeTruthy();
    expect(getByTestId('btn-when-save')).toBeDisabled();
  });

  it('un jour ajouté est coché dans mes dispos, et enregistré avec mon créneau', async () => {
    const now = new Date();
    const nextMonthDay = toDayKey(new Date(now.getFullYear(), now.getMonth() + 1, 15));
    const { getByTestId } = renderPanel({
      scheduling: { ...SCHEDULING, days: [], availabilities: [] },
      recaps: [],
    });

    fireEvent.press(getByTestId('btn-next-month'));
    fireEvent.press(getByTestId('day-cell-15'));
    expect(getByTestId(`my-slot-${nextMonthDay}-start`)).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByTestId('btn-when-save'));
    });

    expect(saveDays).toHaveBeenCalledWith(OUTING, [nextMonthDay]);
    expect(saveMySlots).toHaveBeenCalledWith(OUTING, [
      { day: nextMonthDay, ...DEFAULT_TIME_RANGE },
    ]);
    expect(getByTestId('when-feedback')).toHaveTextContent(/C’est enregistré\./);
  });

  it('un membre ne modifie que ses dispos', async () => {
    const { getByTestId, queryByTestId } = renderPanel({ userId: 'bob', isOrganizer: false });
    expect(queryByTestId('when-calendar')).toBeNull();
    expect(getByTestId('when-days')).toBeTruthy();
    expect(queryByTestId(`btn-choose-day-${DAY_1}`)).toBeNull();

    fireEvent.press(getByTestId(`my-day-${DAY_2}`));
    await act(async () => {
      fireEvent.press(getByTestId('btn-when-save'));
    });

    expect(saveDays).not.toHaveBeenCalled();
    expect(saveMySlots).toHaveBeenCalledWith(OUTING, [{ day: DAY_2, ...DEFAULT_TIME_RANGE }]);
  });

  it('un invité qui n’a pas répondu ne donne pas de dispos', () => {
    const { getByText, queryByTestId } = renderPanel({ userId: 'charlie', isOrganizer: false });
    expect(getByText('Réponds à l’invitation pour donner tes dispos.')).toBeTruthy();
    expect(queryByTestId(`my-day-${DAY_1}`)).toBeNull();
  });

  it('ne plus être dispo un jour retire ce créneau', async () => {
    const { getByTestId, queryByTestId } = renderPanel();
    fireEvent.press(getByTestId(`my-day-${DAY_1}`));
    expect(queryByTestId(`my-slot-${DAY_1}-start`)).toBeNull();
    await act(async () => {
      fireEvent.press(getByTestId('btn-when-save'));
    });
    expect(saveMySlots).toHaveBeenCalledWith(OUTING, []);
  });

  it('affiche une erreur d’enregistrement dans le panneau', async () => {
    saveMySlots.mockRejectedValue(new Error('boom'));
    const { getByTestId } = renderPanel();
    fireEvent.press(getByTestId(`my-day-${DAY_2}`));
    await act(async () => {
      fireEvent.press(getByTestId('btn-when-save'));
    });
    expect(getByTestId('when-feedback')).toHaveTextContent(/Impossible d’enregistrer/);
  });

  it('choisir un jour planifie la sortie au début du créneau commun', async () => {
    updateOuting.mockResolvedValue({ ...OUTING, status: 'planned' });
    const { getByTestId } = renderPanel();
    await act(async () => {
      fireEvent.press(getByTestId(`btn-choose-day-${DAY_1}`));
    });
    expect(updateOuting).toHaveBeenCalledWith('o1', {
      start_date: buildStartDate(DAY_1, '18:00'),
      status: 'planned',
    });
    expect(getByTestId('when-feedback')).toHaveTextContent(/La sortie est planifiée\./);
  });

  it('demande confirmation si des invités n’ont pas répondu', async () => {
    updateOuting.mockResolvedValue({ ...OUTING, status: 'planned' });
    const { getByTestId, getByText } = renderPanel({ pendingCount: 1 });
    fireEvent.press(getByTestId(`btn-choose-day-${DAY_1}`));
    expect(updateOuting).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(getByText('Planifier quand même'));
    });
    expect(updateOuting).toHaveBeenCalled();
  });

  it('une fois la date choisie, l’organisateur peut changer de jour', async () => {
    updateOuting.mockResolvedValue({ ...OUTING });
    const { getByTestId, queryByTestId } = renderPanel({
      outing: { ...OUTING, start_date: '2099-06-10T16:00:00.000Z', status: 'planned' },
    });
    expect(getByTestId('when-chosen-date')).toBeTruthy();
    expect(queryByTestId('when-calendar')).toBeNull();
    expect(queryByTestId(`btn-choose-day-${DAY_1}`)).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId('btn-when-clear-day'));
    });
    expect(updateOuting).toHaveBeenCalledWith('o1', { start_date: null, status: 'draft' });
    expect(getByTestId('when-feedback')).toHaveTextContent(/La date est retirée/);
  });

  it('reprend les jours chargés après l’ouverture au lieu de les effacer', () => {
    const props = {
      onClose,
      outing: OUTING,
      recaps: RECAPS,
      pendingCount: 0,
      userId: 'alice',
      isOrganizer: true,
    };
    const { getByTestId, rerender } = render(<WhenPanel visible scheduling={null} {...props} />);
    expect(getByTestId('btn-when-save')).toBeDisabled();

    rerender(<WhenPanel visible scheduling={SCHEDULING} {...props} />);

    expect(getByTestId(`my-slot-${DAY_1}-start`)).toBeTruthy();
    expect(getByTestId('btn-when-save')).toBeDisabled();
  });

  it('signale dans le panneau un jour qui n’a pas pu être choisi', async () => {
    updateOuting.mockResolvedValue(null);
    const { getByTestId } = renderPanel();
    await act(async () => {
      fireEvent.press(getByTestId(`btn-choose-day-${DAY_1}`));
    });
    expect(getByTestId('when-feedback')).toHaveTextContent(/Impossible de planifier la sortie/);
  });

  it('repart des données enregistrées à chaque ouverture', () => {
    const { getByTestId, queryByTestId, rerender } = renderPanel();
    fireEvent.press(getByTestId(`my-day-${DAY_2}`));
    expect(getByTestId(`my-slot-${DAY_2}-start`)).toBeTruthy();

    const props = {
      onClose,
      outing: OUTING,
      scheduling: SCHEDULING,
      recaps: RECAPS,
      pendingCount: 0,
      userId: 'alice',
      isOrganizer: true,
    };
    rerender(<WhenPanel visible={false} {...props} />);
    rerender(<WhenPanel visible {...props} />);
    expect(queryByTestId(`my-slot-${DAY_2}-start`)).toBeNull();
  });
});
