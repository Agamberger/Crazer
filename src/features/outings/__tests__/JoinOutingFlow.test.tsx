import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useToastStore } from '@/shared/store/useToastStore';
import { OutingRow } from '@/shared/types';
import { JoinOutingFlow } from '../components/scheduling/JoinOutingFlow';
import { PendingInvitationsSection } from '../components/scheduling/PendingInvitationsSection';
import { outingSchedulingService } from '../services/outingSchedulingService';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { OutingMember } from '../types/scheduling';

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
  outing_type: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

const member = (
  userId: string,
  status: OutingMember['status'],
  isOrganizer = false,
): OutingMember => ({
  userId,
  displayName: userId.toUpperCase(),
  avatarUrl: null,
  status,
  isOrganizer,
});

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

  it('sans jour proposé, rejoindre accepte directement sans dispos', async () => {
    service.fetchOutingDays.mockResolvedValue([]);
    service.respondToInvitation.mockResolvedValue();
    const { getByTestId, findByText } = render(<JoinOutingFlow outingId="o1" {...callbacks} />);
    await findByText('Invité par ALICE');

    fireEvent.press(getByTestId('btn-join'));

    await waitFor(() =>
      expect(service.respondToInvitation).toHaveBeenCalledWith('o1', 'accepted', []),
    );
    expect(await findByText('Qui vient ?')).toBeTruthy();
  });

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
