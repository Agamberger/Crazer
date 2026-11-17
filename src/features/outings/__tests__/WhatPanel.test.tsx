import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { OutingRow, PlannedOutingRow } from '@/shared/types';
import { WhatPanel, WhatPanelProps } from '../components/hub/WhatPanel';
import { activityVotesService } from '../services/activityVotesService';
import { outingAnswersService } from '../services/outingAnswersService';
import { outingSchedulingService } from '../services/outingSchedulingService';
import { outingService } from '../services/outingService';
import { useActivityVotesStore } from '../store/useActivityVotesStore';
import { useOutingAnswersStore } from '../store/useOutingAnswersStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { OutingMember } from '../types/scheduling';

jest.setTimeout(20000);

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));

let mockUserId = 'alice';
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: mockUserId } }),
}));

jest.mock('../services/outingService', () => ({
  outingService: {
    updateOuting: jest.fn(),
    fetchPlannedOutings: jest.fn(),
    updatePlannedOuting: jest.fn(),
    deletePlannedOuting: jest.fn(),
  },
}));
jest.mock('../services/outingAnswersService', () => ({
  outingAnswersService: {
    fetchAnswers: jest.fn(),
    fetchAttendingUserIds: jest.fn(),
    saveMyAnswers: jest.fn(),
  },
}));
jest.mock('../services/activityVotesService', () => ({
  activityVotesService: {
    fetchActivities: jest.fn(),
    fetchVotes: jest.fn(),
    subscribeToActivities: jest.fn(),
    placeActivity: jest.fn(),
  },
}));
jest.mock('../services/outingSchedulingService', () => ({
  outingSchedulingService: {
    fetchOutingDays: jest.fn(),
    fetchAvailabilities: jest.fn(),
    fetchMembers: jest.fn(),
  },
}));

const outings = outingService as jest.Mocked<typeof outingService>;
const answers = outingAnswersService as jest.Mocked<typeof outingAnswersService>;
const votes = activityVotesService as jest.Mocked<typeof activityVotesService>;
const scheduling = outingSchedulingService as jest.Mocked<typeof outingSchedulingService>;

const OUTING: OutingRow = {
  id: 'o1',
  title: 'Glouglou',
  description: 'Rendez-vous au métro',
  start_date: null,
  created_by: 'alice',
  status: 'draft',
  cover_image: null,
  outing_type: 'one_day',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

const STEP: PlannedOutingRow = {
  id: 's1',
  outing_id: 'o1',
  title: 'Karting',
  description: null,
  notes: null,
  place_id: null,
  activity_id: null,
  scheduled_for: '2099-06-10T14:00:00.000Z',
  duration_min: 60,
  status: 'pending',
  created_by: 'alice',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
} as PlannedOutingRow;

const member = (userId: string): OutingMember => ({
  userId,
  displayName: userId,
  avatarUrl: null,
  status: 'accepted',
  isOrganizer: userId === 'alice',
});

const onClose = jest.fn();
const onOpenPlanning = jest.fn();

const renderPanel = (overrides: Partial<WhatPanelProps> = {}) =>
  render(
    <WhatPanel
      visible
      onClose={onClose}
      outing={OUTING}
      userId={mockUserId}
      isOrganizer={mockUserId === 'alice'}
      onOpenPlanning={onOpenPlanning}
      {...overrides}
    />,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'alice';
  useOutingsStore.setState({
    outings: [OUTING],
    plannedOutings: [],
    selectedOutingId: null,
    selectedPlannedOutingId: null,
    fetchOutingById: jest.fn(),
  });
  useOutingAnswersStore.setState(useOutingAnswersStore.getInitialState(), true);
  useActivityVotesStore.setState(useActivityVotesStore.getInitialState(), true);
  useOutingSchedulingStore.setState(useOutingSchedulingStore.getInitialState(), true);
  answers.fetchAnswers.mockResolvedValue([]);
  answers.fetchAttendingUserIds.mockResolvedValue(['alice', 'bob']);
  answers.saveMyAnswers.mockResolvedValue();
  votes.fetchActivities.mockResolvedValue([
    {
      id: 'a1',
      outingId: 'o1',
      title: 'Bowling',
      note: null,
      proposedBy: 'bob',
      place: null,
      createdAt: '2026-11-01T10:00:00Z',
    },
  ]);
  votes.fetchVotes.mockResolvedValue([]);
  votes.subscribeToActivities.mockReturnValue(jest.fn());
  scheduling.fetchOutingDays.mockResolvedValue([]);
  scheduling.fetchAvailabilities.mockResolvedValue([]);
  scheduling.fetchMembers.mockResolvedValue([member('alice'), member('bob')]);
  outings.fetchPlannedOutings.mockResolvedValue([STEP]);
});

describe('WhatPanel', () => {
  it('montre le type, les questions, les activités, les détails et le programme', async () => {
    const { findByTestId, findByText, getByTestId } = renderPanel();
    expect(await findByTestId('what-type-label')).toHaveTextContent('☀️ Une journée');
    expect(await findByText('Bowling')).toBeTruthy();
    expect(getByTestId('input-what-description').props.value).toBe('Rendez-vous au métro');
    expect(await findByText('Karting')).toBeTruthy();
  });

  it('l’organisateur choisit le type quand il n’est pas encore choisi', async () => {
    useOutingsStore.setState({ outings: [{ ...OUTING, outing_type: null }] });
    outings.updateOuting.mockResolvedValue({ ...OUTING, outing_type: 'holidays' });
    const { findByTestId } = renderPanel({ outing: { ...OUTING, outing_type: null } });
    fireEvent.press(await findByTestId('outing-type-holidays'));
    await waitFor(() =>
      expect(outings.updateOuting).toHaveBeenCalledWith('o1', { outing_type: 'holidays' }),
    );
  });

  it('enregistre mes réponses et le confirme dans le panneau', async () => {
    const { findByTestId, getByTestId } = renderPanel();
    fireEvent.press(await findByTestId('question-day-preferences-evening'));
    await act(async () => {
      fireEvent.press(getByTestId('btn-what-save-answers'));
    });
    expect(answers.saveMyAnswers).toHaveBeenCalledWith(
      'o1',
      'alice',
      expect.objectContaining({ dayPreferences: ['evening'] }),
    );
    expect(getByTestId('what-answers-feedback')).toHaveTextContent(
      /Tes réponses sont enregistrées/,
    );
  });

  it('signale un échec d’enregistrement des réponses', async () => {
    answers.saveMyAnswers.mockRejectedValue(new Error('boom'));
    const { findByTestId, getByTestId } = renderPanel();
    fireEvent.press(await findByTestId('question-day-preferences-evening'));
    await act(async () => {
      fireEvent.press(getByTestId('btn-what-save-answers'));
    });
    expect(getByTestId('what-answers-feedback')).toHaveTextContent(/Impossible d’enregistrer/);
  });

  it('l’organisateur enregistre la description et le statut', async () => {
    outings.updateOuting.mockResolvedValue({ ...OUTING, description: 'Gare de Lyon' });
    const { getByTestId } = renderPanel();
    expect(getByTestId('btn-what-save-details')).toBeDisabled();
    fireEvent.changeText(getByTestId('input-what-description'), ' Gare de Lyon ');
    fireEvent.press(getByTestId('what-status-planned'));
    await act(async () => {
      fireEvent.press(getByTestId('btn-what-save-details'));
    });
    expect(outings.updateOuting).toHaveBeenCalledWith('o1', {
      description: 'Gare de Lyon',
      status: 'planned',
    });
    expect(getByTestId('what-details-feedback')).toHaveTextContent(/Les détails sont enregistrés/);
  });

  it('un membre lit la description sans pouvoir la modifier', () => {
    mockUserId = 'bob';
    const { getByTestId, queryByTestId } = renderPanel();
    expect(getByTestId('what-description')).toHaveTextContent('Rendez-vous au métro');
    expect(queryByTestId('input-what-description')).toBeNull();
    expect(queryByTestId('btn-what-change-type')).toBeNull();
  });

  it('modifie une étape dans une page qui arrive de la droite', async () => {
    outings.updatePlannedOuting.mockResolvedValue({ ...STEP, title: 'Karting indoor' });
    const { findByLabelText, getByTestId, findByTestId } = renderPanel();
    fireEvent.press(await findByLabelText("Modifier l'étape Karting"));
    expect(await findByTestId('planned-outing-edit-form')).toBeTruthy();

    fireEvent.changeText(getByTestId('input-planned-title'), 'Karting indoor');
    await act(async () => {
      fireEvent.press(getByTestId('btn-submit-planned'));
    });
    expect(outings.updatePlannedOuting).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ title: 'Karting indoor' }),
    );
    expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
  });

  it('« → Programme » place l’activité après la dernière étape', async () => {
    votes.placeActivity.mockResolvedValue('s2');
    const { findByTestId, getByTestId } = renderPanel();
    await findByTestId('drag-handle-a1');
    await waitFor(() => expect(useOutingsStore.getState().plannedOutings).toHaveLength(1));
    await act(async () => {
      fireEvent.press(getByTestId('btn-place-a1'));
    });
    expect(votes.placeActivity).toHaveBeenCalledWith('a1', '2099-06-10T15:00:00.000Z', 60);
  });

  it('signale dans le panneau une activité qui n’a pas pu être placée', async () => {
    votes.placeActivity.mockRejectedValue(new Error('activity already placed'));
    const { findByTestId, getByTestId } = renderPanel();
    await act(async () => {
      fireEvent.press(await findByTestId('btn-place-a1'));
    });
    expect(getByTestId('what-placement-error')).toHaveTextContent(/Impossible d’ajouter/);
  });

  it('ferme le panneau avant d’ouvrir le planning de la journée', async () => {
    const { getByTestId } = renderPanel();
    fireEvent.press(getByTestId('btn-what-planning'));
    expect(onClose).toHaveBeenCalled();
    expect(onOpenPlanning).toHaveBeenCalled();
  });
});
