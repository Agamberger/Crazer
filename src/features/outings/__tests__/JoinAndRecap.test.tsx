import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useToastStore } from '@/shared/store/useToastStore';
import { OutingRow } from '@/shared/types';
import { AvailabilityRecap } from '../components/scheduling/AvailabilityRecap';
import { JoinOutingFlow } from '../components/scheduling/JoinOutingFlow';
import { PendingInvitationsSection } from '../components/scheduling/PendingInvitationsSection';
import { outingSchedulingService } from '../services/outingSchedulingService';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { OutingMember } from '../types/scheduling';
import { buildStartDate } from '../utils/availabilityUtils';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));

let mockUserId = 'bob';
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: mockUserId } }),
}));

jest.mock('../services/outingSchedulingService', () => ({
  outingSchedulingService: {
    respondToInvitation: jest.fn(),
    fetchOutingDays: jest.fn(),
    fetchAvailabilities: jest.fn(),
    fetchMembers: jest.fn(),
    fetchMyInvitations: jest.fn(),
    subscribeToOutingScheduling: jest.fn(),
  },
}));

const service = outingSchedulingService as jest.Mocked<typeof outingSchedulingService>;

const OUTING: OutingRow = {
  id: 'o1',
  title: 'Glouglou',
  description: null,
  start_date: '2026-11-10T11:00:00.000Z',
  created_by: 'alice',
  status: 'draft',
  cover_image: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

const member = (
  userId: string,
  status: OutingMember['status'],
  isOrganizer = false,
): OutingMember => ({ userId, displayName: userId.toUpperCase(), avatarUrl: null, status, isOrganizer });

const unsubscribe = jest.fn();
const updateOuting = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'bob';
  useToastStore.getState().clear();
  useOutingSchedulingStore.setState(useOutingSchedulingStore.getInitialState(), true);
  useOutingsStore.setState({ outings: [OUTING], updateOuting, fetchOutingById: jest.fn() });
  service.subscribeToOutingScheduling.mockReturnValue(unsubscribe);
  service.fetchOutingDays.mockResolvedValue(['2026-11-10', '2026-11-11']);
  service.fetchAvailabilities.mockResolvedValue([
    { userId: 'alice', day: '2026-11-10', start: '12:00', end: '21:00' },
  ]);
  service.fetchMembers.mockResolvedValue([
    member('alice', 'accepted', true),
    member('bob', 'invited'),
  ]);
});

describe('JoinOutingFlow', () => {
  const callbacks = { onJoined: jest.fn(), onDeclined: jest.fn(), onClose: jest.fn() };

  it('affiche l’invitation puis enchaîne jour → dispos → qui vient', async () => {
    service.respondToInvitation.mockResolvedValue();
    const { getByTestId, findByText, getByText } = render(
      <JoinOutingFlow outingId="o1" {...callbacks} />,
    );

    expect(await findByText('Invité par ALICE')).toBeTruthy();
    expect(service.subscribeToOutingScheduling).toHaveBeenCalledWith('o1', expect.any(Function));

    fireEvent.press(getByTestId('btn-join'));
    expect(getByText('Quel jour ?')).toBeTruthy();
    fireEvent.press(getByTestId('chip-day-2026-11-10'));
    fireEvent.press(getByTestId('btn-join-next'));

    expect(getByText('Mes dispos')).toBeTruthy();
    fireEvent.press(getByText('Envoyer mes dispos'));

    await waitFor(() =>
      expect(service.respondToInvitation).toHaveBeenCalledWith('o1', 'accepted', [
        { day: '2026-11-10', start: '18:00', end: '23:00' },
      ]),
    );
    expect(await findByText('Qui vient ?')).toBeTruthy();
    fireEvent.press(getByText('Voir le récap'));
    expect(callbacks.onJoined).toHaveBeenCalled();
  }, 20000);

  it('permet de refuser l’invitation', async () => {
    service.respondToInvitation.mockResolvedValue();
    const { getByTestId, findByText } = render(<JoinOutingFlow outingId="o1" {...callbacks} />);
    await findByText('Invité par ALICE');

    fireEvent.press(getByTestId('btn-decline-invitation'));

    await waitFor(() => expect(callbacks.onDeclined).toHaveBeenCalled());
    expect(service.respondToInvitation).toHaveBeenCalledWith('o1', 'declined', []);
  });

  it('affiche un état vide pour une sortie inaccessible', () => {
    useOutingsStore.setState({ outings: [] });
    const { getByText } = render(<JoinOutingFlow outingId="unknown" {...callbacks} />);
    fireEvent.press(getByText('Fermer'));
    expect(callbacks.onClose).toHaveBeenCalled();
  });
});

describe('AvailabilityRecap', () => {
  const onPlanned = jest.fn();
  const onContinue = jest.fn();
  const onClose = jest.fn();

  it('affiche le créneau commun par jour et les réponses en attente', async () => {
    const { findByTestId, getByTestId, getByText } = render(
      <AvailabilityRecap outingId="o1" onPlanned={onPlanned} onContinue={onContinue} onClose={onClose} />,
    );

    expect((await findByTestId('day-recap-slot-2026-11-10')).props.children).toBe('12h – 21h');
    expect(getByTestId('day-recap-slot-2026-11-11').props.children).toBe('Personne de dispo');
    expect(getByText('En attente de 1 réponse.')).toBeTruthy();
    expect(getByText('ALICE (organisateur)')).toBeTruthy();
  });

  it('se désabonne du temps réel au démontage', async () => {
    const { findByTestId, unmount } = render(
      <AvailabilityRecap outingId="o1" onPlanned={onPlanned} onContinue={onContinue} onClose={onClose} />,
    );
    await findByTestId('availability-recap');
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('l’organisateur peut continuer sans choisir de jour', async () => {
    mockUserId = 'alice';
    const { findByTestId, getByTestId } = render(
      <AvailabilityRecap outingId="o1" onPlanned={onPlanned} onContinue={onContinue} onClose={onClose} />,
    );
    await findByTestId('availability-recap');

    fireEvent.press(getByTestId('btn-recap-continue'));

    expect(onContinue).toHaveBeenCalled();
    expect(updateOuting).not.toHaveBeenCalled();
    expect(onPlanned).not.toHaveBeenCalled();
  });

  it('un invité n’a que « Fermer » (il ne peut pas modifier la sortie)', async () => {
    const { findByTestId, queryByTestId, getByTestId } = render(
      <AvailabilityRecap outingId="o1" onPlanned={onPlanned} onContinue={onContinue} onClose={onClose} />,
    );
    await findByTestId('availability-recap');
    expect(queryByTestId('btn-recap-continue')).toBeNull();
    fireEvent.press(getByTestId('btn-recap-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('un invité ne peut pas choisir le jour', async () => {
    const { findByTestId, queryByTestId } = render(
      <AvailabilityRecap outingId="o1" onPlanned={onPlanned} onContinue={onContinue} onClose={onClose} />,
    );
    await findByTestId('availability-recap');
    expect(queryByTestId('btn-choose-day-2026-11-10')).toBeNull();
  });

  it('l’organisateur confirme « continuer sans tout le monde » puis planifie', async () => {
    mockUserId = 'alice';
    updateOuting.mockResolvedValue({ ...OUTING, status: 'planned' });
    const { findByTestId, getByText } = render(
      <AvailabilityRecap outingId="o1" onPlanned={onPlanned} onContinue={onContinue} onClose={onClose} />,
    );

    fireEvent.press(await findByTestId('btn-choose-day-2026-11-10'));
    expect(getByText('Continuer sans tout le monde ?')).toBeTruthy();
    fireEvent.press(getByText('Planifier quand même'));

    await waitFor(() => expect(onPlanned).toHaveBeenCalled());
    expect(updateOuting).toHaveBeenCalledWith('o1', {
      start_date: buildStartDate('2026-11-10', '12:00'),
      status: 'planned',
    });
  });

  it('planifie directement quand tout le monde a répondu', async () => {
    mockUserId = 'alice';
    service.fetchMembers.mockResolvedValue([member('alice', 'accepted', true)]);
    updateOuting.mockResolvedValue(null);
    const { findByTestId } = render(
      <AvailabilityRecap outingId="o1" onPlanned={onPlanned} onContinue={onContinue} onClose={onClose} />,
    );

    fireEvent.press(await findByTestId('btn-choose-day-2026-11-10'));

    await waitFor(() => expect(updateOuting).toHaveBeenCalled());
    expect(onPlanned).not.toHaveBeenCalled();
    expect(useToastStore.getState().queue).toContainEqual(expect.objectContaining({ tone: 'error' }));
  });
});

describe('PendingInvitationsSection', () => {
  it('ne rend rien sans invitation', () => {
    const { toJSON } = render(
      <PendingInvitationsSection invitations={[]} onOpenInvitation={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('liste les invitations et ouvre celle choisie', () => {
    const onOpen = jest.fn();
    const invitation = { outing: OUTING, organizerName: 'Alice', invitedAt: '' };
    const { getByText, getByTestId } = render(
      <PendingInvitationsSection invitations={[invitation]} onOpenInvitation={onOpen} />,
    );
    expect(getByText('Invitations (1)')).toBeTruthy();
    fireEvent.press(getByTestId('invitation-o1'));
    expect(onOpen).toHaveBeenCalledWith(invitation);
  });
});
