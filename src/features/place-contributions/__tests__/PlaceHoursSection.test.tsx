import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PlaceHoursSection } from '../components/PlaceHoursSection';
import { periodsToWeek, weekToPeriods } from '../components/OpeningHoursEditor';
import { placeContributionsService } from '../services/placeContributionsService';
import { ContributionError } from '../services/contributionError';
import { PlaceHoursProposal } from '../types/contributions';

jest.mock('@/features/auth', () => ({ useAuth: () => ({ user: { id: 'alice' } }) }));
jest.mock('../services/placeContributionsService', () => ({
  placeContributionsService: {
    fetchHoursProposals: jest.fn(),
    fetchMyHoursVotes: jest.fn(),
    proposeHours: jest.fn(),
    voteHours: jest.fn(),
  },
}));

const service = placeContributionsService as jest.Mocked<typeof placeContributionsService>;
// Monday 2026-11-30, 12:30
const monday = () => new Date('2026-11-30T12:30:00');

const proposal = (overrides: Partial<PlaceHoursProposal>): PlaceHoursProposal => ({
  id: 'h1',
  placeId: 'p1',
  proposedBy: 'bob',
  periods: [{ day: 0, open: '12:00', close: '14:00' }],
  status: 'confirmed',
  yesCount: 3,
  noCount: 0,
  updatedAt: 't',
  ...overrides,
});

const GOOGLE_HOURS = ['lundi: 09:00 – 18:00', 'mardi: 09:00 – 18:00'];

describe('PlaceHoursSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service.fetchMyHoursVotes.mockResolvedValue({});
  });

  it('shows confirmed community hours first, with a discreet ✓ and the source on demand', async () => {
    service.fetchHoursProposals.mockResolvedValue([proposal({})]);

    render(
      <PlaceHoursSection
        placeId="p1"
        resolvePlaceId={jest.fn()}
        fallbackHours={GOOGLE_HOURS}
        fallbackOpenNow={false}
        fallbackSourceLabel="Google Maps"
        now={monday}
      />,
    );

    expect(await screen.findByTestId('place-hours-community')).toBeTruthy();
    expect(screen.getByText('Ouvert maintenant')).toBeTruthy();
    expect(screen.queryByTestId('place-hours-fallback')).toBeNull();
    expect(screen.queryByTestId('place-hours-confirmed-info')).toBeNull();

    fireEvent.press(screen.getByTestId('place-hours-confirmed-mark'));
    expect(screen.getByText('Horaires confirmés par 3 membres de Crazer')).toBeTruthy();

    fireEvent.press(screen.getByTestId('place-hours-fallback-toggle'));
    expect(screen.getByTestId('place-hours-fallback')).toBeTruthy();
    expect(screen.getByText('lundi: 09:00 – 18:00')).toBeTruthy();
  });

  it('falls back to the other source without any source marker', async () => {
    service.fetchHoursProposals.mockResolvedValue([]);

    render(
      <PlaceHoursSection
        placeId="p1"
        resolvePlaceId={jest.fn()}
        fallbackHours={GOOGLE_HOURS}
        fallbackOpenNow
        now={monday}
      />,
    );

    expect(await screen.findByTestId('place-hours-fallback')).toBeTruthy();
    expect(screen.getByText('Ouvert maintenant')).toBeTruthy();
    expect(screen.queryByTestId('place-hours-confirmed-mark')).toBeNull();
    expect(screen.getByText('Proposer des horaires')).toBeTruthy();
  });

  it('asks discreetly to check someone else’s proposal and sends the vote', async () => {
    service.fetchHoursProposals
      .mockResolvedValueOnce([proposal({ id: 'h2', status: 'pending', yesCount: 0 })])
      .mockResolvedValue([proposal({ id: 'h2', status: 'pending', yesCount: 1 })]);
    service.fetchMyHoursVotes.mockResolvedValueOnce({}).mockResolvedValue({ h2: true });
    service.voteHours.mockResolvedValue(proposal({ id: 'h2', status: 'pending', yesCount: 1 }));

    render(<PlaceHoursSection placeId="p1" resolvePlaceId={jest.fn()} now={monday} />);

    fireEvent.press(await screen.findByTestId('place-hours-vote-yes'));

    await waitFor(() => expect(service.voteHours).toHaveBeenCalledWith('h2', true));
    await waitFor(() => expect(screen.queryByTestId('place-hours-review')).toBeNull());
  });

  it('shows the user’s own pending proposal instead of asking them to vote', async () => {
    service.fetchHoursProposals.mockResolvedValue([
      proposal({ proposedBy: 'alice', status: 'pending' }),
    ]);

    render(<PlaceHoursSection placeId="p1" resolvePlaceId={jest.fn()} now={monday} />);

    expect(await screen.findByTestId('place-hours-my-pending')).toBeTruthy();
    expect(screen.queryByTestId('place-hours-review')).toBeNull();
  });

  it('saves an unsaved place, then proposes the hours typed in the editor (never Google’s)', async () => {
    const resolvePlaceId = jest.fn().mockResolvedValue('new-place');
    service.fetchHoursProposals.mockResolvedValue([]);
    service.proposeHours.mockResolvedValue(proposal({ status: 'pending', proposedBy: 'alice' }));

    render(
      <PlaceHoursSection
        placeId={null}
        resolvePlaceId={resolvePlaceId}
        fallbackHours={GOOGLE_HOURS}
        now={monday}
      />,
    );

    fireEvent.press(screen.getByTestId('place-hours-edit'));
    fireEvent(screen.getByTestId('opening-hours-open-2'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('opening-hours-submit'));

    await waitFor(() =>
      expect(service.proposeHours).toHaveBeenCalledWith('new-place', [
        { day: 2, open: '12:00', close: '22:00' },
      ]),
    );
    expect(resolvePlaceId).toHaveBeenCalled();
  });

  it('shows the French message of a failed proposal', async () => {
    service.fetchHoursProposals.mockResolvedValue([]);
    service.proposeHours.mockRejectedValue(new ContributionError('invalid'));

    render(<PlaceHoursSection placeId="p1" resolvePlaceId={jest.fn()} now={monday} />);
    await waitFor(() => expect(service.fetchHoursProposals).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('place-hours-edit'));
    fireEvent(screen.getByTestId('opening-hours-open-0'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('opening-hours-submit'));

    expect(await screen.findByText('Contribution invalide.')).toBeTruthy();
  });
});

describe('OpeningHoursEditor grid', () => {
  it('converts periods to the week grid and back, two ranges per day at most', () => {
    const week = periodsToWeek([
      { day: 0, open: '12:00', close: '14:00' },
      { day: 0, open: '19:00', close: '23:00' },
      { day: 0, open: '23:30', close: '01:00' },
      { day: 5, open: '19:00', close: '02:00' },
    ]);
    expect(week[0]).toHaveLength(2);
    expect(week[1]).toEqual([]);
    expect(weekToPeriods(week)).toEqual([
      { day: 0, open: '12:00', close: '14:00' },
      { day: 0, open: '19:00', close: '23:00' },
      { day: 5, open: '19:00', close: '02:00' },
    ]);
  });
});
