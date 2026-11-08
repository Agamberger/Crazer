import { create } from 'zustand';
import { bindSetToSession, registerUserScopedStore } from '@/shared/store/sessionReset';
import { OutingType } from '@/shared/types';
import { outingAnswersService } from '../services/outingAnswersService';
import { MemberAnswers, OutingAnswers } from '../types/questions';
import { useOutingsStore } from './useOutingsStore';

interface OutingAnswersState {
  answersByOutingId: Record<string, MemberAnswers[]>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  /** Loads the group's answers; returns `null` when the loading failed. */
  fetchAnswers: (outingId: string) => Promise<MemberAnswers[] | null>;
  /** Saves the user's answers. Throws on failure. */
  saveMyAnswers: (outingId: string, userId: string, answers: OutingAnswers) => Promise<void>;
  /** Sets (or clears with `null`) the outing type, organizer only. Throws on failure. */
  setOutingType: (outingId: string, outingType: OutingType | null) => Promise<void>;
}

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

export const useOutingAnswersStore = create<OutingAnswersState>((set) => ({
  answersByOutingId: {},
  isLoading: false,
  isSaving: false,
  error: null,

  fetchAnswers: async (outingId) => {
    const setLive = bindSetToSession(set);
    setLive({ isLoading: true, error: null });
    try {
      const answers = await outingAnswersService.fetchAnswers(outingId);
      setLive((state) => ({
        answersByOutingId: { ...state.answersByOutingId, [outingId]: answers },
        isLoading: false,
      }));
      return answers;
    } catch (err: unknown) {
      setLive({ error: errorMessage(err, 'Erreur lors du chargement des réponses'), isLoading: false });
      return null;
    }
  },

  saveMyAnswers: async (outingId, userId, answers) => {
    const setLive = bindSetToSession(set);
    setLive({ isSaving: true, error: null });
    try {
      await outingAnswersService.saveMyAnswers(outingId, userId, answers);
      setLive((state) => ({
        answersByOutingId: {
          ...state.answersByOutingId,
          [outingId]: [
            ...(state.answersByOutingId[outingId] ?? []).filter((a) => a.userId !== userId),
            { ...answers, userId },
          ],
        },
        isSaving: false,
      }));
    } catch (err: unknown) {
      setLive({ error: errorMessage(err, 'Erreur lors de l’enregistrement des réponses'), isSaving: false });
      throw err;
    }
  },

  setOutingType: async (outingId, outingType) => {
    const setLive = bindSetToSession(set);
    setLive({ isSaving: true, error: null });
    const updated = await useOutingsStore.getState().updateOuting(outingId, {
      outing_type: outingType,
    });
    setLive({ isSaving: false });
    if (!updated) {
      throw new Error(useOutingsStore.getState().error ?? 'Erreur lors du choix du type de sortie');
    }
  },
}));

// Data of the logged-in account: cleared on logout.
registerUserScopedStore(useOutingAnswersStore);
