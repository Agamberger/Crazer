import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useToastStore } from '@/shared/store/useToastStore';
import { OutingRow } from '@/shared/types';
import { WhatQuestionsSection } from '../components/hub/what/WhatQuestionsSection';
import { outingAnswersService } from '../services/outingAnswersService';
import { outingService } from '../services/outingService';
import { useOutingAnswersStore } from '../store/useOutingAnswersStore';
import { useOutingsStore } from '../store/useOutingsStore';

jest.setTimeout(20000);

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));

let mockUserId = 'alice';
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: mockUserId } }),
}));

jest.mock('../services/outingService', () => ({ outingService: { updateOuting: jest.fn() } }));
jest.mock('../services/outingAnswersService', () => ({
  outingAnswersService: {
    fetchAnswers: jest.fn(),
    fetchAttendingUserIds: jest.fn(),
    saveMyAnswers: jest.fn(),
  },
}));

const outings = outingService as jest.Mocked<typeof outingService>;
const answersService = outingAnswersService as jest.Mocked<typeof outingAnswersService>;

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

const renderQuestions = () => render(<WhatQuestionsSection outingId="o1" />);

const setOutingType = (outing_type: OutingRow['outing_type']) =>
  useOutingsStore.setState({ outings: [{ ...OUTING, outing_type }] });

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'alice';
  useToastStore.getState().clear();
  useOutingAnswersStore.setState(useOutingAnswersStore.getInitialState(), true);
  useOutingsStore.setState({ outings: [OUTING], fetchOutingById: jest.fn() });
  answersService.fetchAttendingUserIds.mockResolvedValue(['alice', 'bob']);
  answersService.fetchAnswers.mockResolvedValue([]);
  answersService.saveMyAnswers.mockResolvedValue();
});

describe('WhatQuestionsSection — choix du type', () => {
  it('l’organisateur choisit le type de sortie', async () => {
    outings.updateOuting.mockResolvedValue({ ...OUTING, outing_type: 'holidays' });
    const { findByTestId } = renderQuestions();

    fireEvent.press(await findByTestId('outing-type-holidays'));

    await waitFor(() => expect(outings.updateOuting).toHaveBeenCalledWith('o1', { outing_type: 'holidays' }));
    expect(await findByTestId('what-type-label')).toBeTruthy();
  });

  it('un membre attend que l’organisateur ait choisi le type', async () => {
    mockUserId = 'bob';
    const { findByTestId, queryByTestId } = renderQuestions();
    expect(await findByTestId('what-waiting-type')).toBeTruthy();
    expect(queryByTestId('outing-type-precise')).toBeNull();
  });

  it('prévient quand le type ne peut pas être enregistré', async () => {
    outings.updateOuting.mockRejectedValue(new Error('rls'));
    const { findByTestId } = renderQuestions();
    fireEvent.press(await findByTestId('outing-type-precise'));
    await waitFor(() =>
      expect(useToastStore.getState().queue).toContainEqual(expect.objectContaining({ tone: 'error' })),
    );
  });

  it('l’organisateur peut changer de type', async () => {
    setOutingType('precise');
    outings.updateOuting.mockResolvedValue({ ...OUTING, outing_type: null });
    const { findByTestId } = renderQuestions();
    fireEvent.press(await findByTestId('btn-what-change-type'));
    await waitFor(() => expect(outings.updateOuting).toHaveBeenCalledWith('o1', { outing_type: null }));
    expect(await findByTestId('outing-type-precise')).toBeTruthy();
  });
});

describe('WhatQuestionsSection — sortie précise', () => {
  beforeEach(() => setOutingType('precise'));

  it('permet d’enregistrer sans répondre à aucune question', async () => {
    const { findByTestId } = renderQuestions();
    fireEvent.press(await findByTestId('btn-what-save-answers'));
    await waitFor(() => expect(answersService.saveMyAnswers).toHaveBeenCalled());
  });

  it('enregistre les réponses puis termine', async () => {
    const { findByTestId } = renderQuestions();
    fireEvent.press(await findByTestId('question-activity-drinks'));
    fireEvent.press(await findByTestId('question-time-19:00'));
    fireEvent.press(await findByTestId('question-eat-before-no'));
    fireEvent.changeText(await findByTestId('question-place'), 'Un rooftop');
    fireEvent.press(await findByTestId('btn-what-save-answers'));

    await waitFor(() => expect(answersService.saveMyAnswers).toHaveBeenCalled());
    expect(answersService.saveMyAnswers).toHaveBeenCalledWith(
      'o1',
      'alice',
      expect.objectContaining({
        activityType: 'drinks',
        preferredTime: '19:00',
        eatBefore: false,
        placeWish: 'Un rooftop',
      }),
    );
  });

  it('préremplit avec les réponses déjà enregistrées et affiche la progression', async () => {
    answersService.fetchAnswers.mockResolvedValue([
      {
        userId: 'alice', activityType: 'food', placeWish: '', preferredTime: null,
        eatBefore: null, dayPreferences: [], periodStart: null, periodEnd: null, budget: null, wishes: [],
      },
    ]);
    const { findByTestId } = renderQuestions();
    expect((await findByTestId('questions-progress')).props.children.join('')).toContain('1 / 2');
    fireEvent.press(await findByTestId('btn-what-save-answers'));
    await waitFor(() => expect(answersService.saveMyAnswers).toHaveBeenCalled());
  });

  it('prévient quand l’enregistrement échoue', async () => {
    answersService.saveMyAnswers.mockRejectedValue(new Error('denied'));
    const { findByTestId } = renderQuestions();
    fireEvent.press(await findByTestId('btn-what-save-answers'));
    await waitFor(() =>
      expect(useToastStore.getState().queue).toContainEqual(expect.objectContaining({ tone: 'error' })),
    );
    expect(await findByTestId('what-answers-feedback')).toHaveTextContent(/Impossible/);
  });

  it('un membre ne peut pas changer le type', async () => {
    mockUserId = 'bob';
    const { findByTestId, queryByTestId } = renderQuestions();
    await findByTestId('btn-what-save-answers');
    expect(queryByTestId('btn-what-change-type')).toBeNull();
  });
});

describe('WhatQuestionsSection — robustesse', () => {
  beforeEach(() => setOutingType('precise'));

  it('n’affiche pas de formulaire vierge quand le chargement des réponses échoue', async () => {
    answersService.fetchAnswers.mockRejectedValue(new Error('boom'));
    const { findByTestId, queryByTestId } = renderQuestions();
    expect(await findByTestId('what-questions-load-failed')).toBeTruthy();
    expect(queryByTestId('btn-what-save-answers')).toBeNull();
  });

  it('ne compte que les réponses des participants attendus', async () => {
    answersService.fetchAttendingUserIds.mockResolvedValue(['alice']);
    answersService.fetchAnswers.mockResolvedValue(
      ['alice', 'declined-user'].map((userId) => ({
        userId, activityType: 'food', placeWish: '', preferredTime: null,
        eatBefore: null, dayPreferences: [], periodStart: null, periodEnd: null, budget: null, wishes: [],
      })),
    );
    const { findByTestId } = renderQuestions();
    expect((await findByTestId('questions-progress')).props.children.join('')).toContain('1 / 1');
  });

  it('ne compte pas un formulaire vide comme une réponse', async () => {
    answersService.fetchAnswers.mockResolvedValue([
      {
        userId: 'alice', activityType: null, placeWish: '', preferredTime: null, eatBefore: null,
        dayPreferences: [], periodStart: null, periodEnd: null, budget: null, wishes: [],
      },
    ]);
    const { findByTestId } = renderQuestions();
    expect((await findByTestId('questions-progress')).props.children.join('')).toContain('0 / 2');
  });

  it('une réponse sélectionnée peut être effacée en la touchant de nouveau', async () => {
    const { findByTestId } = renderQuestions();
    fireEvent.press(await findByTestId('question-eat-before-yes'));
    fireEvent.press(await findByTestId('question-eat-before-yes'));
    fireEvent.press(await findByTestId('btn-what-save-answers'));
    await waitFor(() =>
      expect(answersService.saveMyAnswers).toHaveBeenCalledWith(
        'o1',
        'alice',
        expect.objectContaining({ eatBefore: null }),
      ),
    );
  });
});

describe('WhatQuestionsSection — une journée et vacances', () => {
  it('une journée : exige au moins une préférence', async () => {
    setOutingType('one_day');
    const { findByTestId } = renderQuestions();
    fireEvent.press(await findByTestId('btn-what-save-answers'));
    expect(await findByTestId('questions-error')).toBeTruthy();

    fireEvent.press(await findByTestId('question-day-preferences-outdoor'));
    fireEvent.press(await findByTestId('question-day-preferences-morning'));
    fireEvent.press(await findByTestId('btn-what-save-answers'));

    await waitFor(() => expect(answersService.saveMyAnswers).toHaveBeenCalled());
    expect(answersService.saveMyAnswers).toHaveBeenCalledWith(
      'o1',
      'alice',
      expect.objectContaining({ dayPreferences: ['morning', 'outdoor'] }),
    );
  });

  describe('vacances', () => {
    beforeEach(() => {
      setOutingType('holidays');
      jest.useFakeTimers({
        now: new Date(2026, 10, 1),
        doNotFake: [
          'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate',
          'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame',
          'cancelAnimationFrame', 'performance', 'hrtime',
        ],
      });
    });
    afterEach(() => jest.useRealTimers());

    it('exige une période', async () => {
      const { findByTestId } = renderQuestions();
      fireEvent.press(await findByTestId('btn-what-save-answers'));
      expect(await findByTestId('questions-error')).toBeTruthy();
      expect(answersService.saveMyAnswers).not.toHaveBeenCalled();
    });

    it('enregistre la période choisie dans le calendrier avec budget et envies', async () => {
      const { findByTestId } = renderQuestions();
      fireEvent.press(await findByTestId('day-cell-20'));
      fireEvent.press(await findByTestId('day-cell-10'));
      fireEvent.press(await findByTestId('question-budget-medium'));
      fireEvent.press(await findByTestId('question-wishes-beach'));
      fireEvent.press(await findByTestId('btn-what-save-answers'));

      await waitFor(() => expect(answersService.saveMyAnswers).toHaveBeenCalled());
      expect(answersService.saveMyAnswers).toHaveBeenCalledWith(
        'o1',
        'alice',
        expect.objectContaining({
          periodStart: '2026-11-10',
          periodEnd: '2026-11-20',
          budget: 'medium',
          wishes: ['beach'],
        }),
      );
    });
  });
});
