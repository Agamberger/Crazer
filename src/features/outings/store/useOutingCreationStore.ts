import { create } from 'zustand';
import { TimeRange } from '@/shared/components';
import { registerUserScopedStore } from '@/shared/store/sessionReset';
import { OutingType } from '@/shared/types';
import { DayKey, OutingDraft } from '../types/scheduling';
import { syncSlotsWithDays } from '../utils/availabilityUtils';

/** Wizard steps, in order: « On sort ! », « Quel genre ? », « Avec qui ? », « Quand ? », « Mes dispos ». */
export const CREATION_STEPS = ['name', 'type', 'invitees', 'days', 'availability'] as const;
export type CreationStep = (typeof CREATION_STEPS)[number];

interface OutingCreationState extends OutingDraft {
  stepIndex: number;

  setTitle: (title: string) => void;
  setOutingType: (outingType: OutingType) => void;
  /** Replaces the selected days; slots of kept days are preserved, new days get the default slot. */
  setDays: (days: DayKey[]) => void;
  setSlot: (day: DayKey, range: TimeRange) => void;
  setInviteeIds: (ids: string[]) => void;
  nextStep: () => void;
  previousStep: () => void;
  reset: () => void;
}

const INITIAL_DRAFT: OutingDraft & { stepIndex: number } = {
  stepIndex: 0,
  title: '',
  outingType: null,
  days: [],
  slots: {},
  inviteeIds: [],
};

export const useOutingCreationStore = create<OutingCreationState>((set) => ({
  ...INITIAL_DRAFT,

  setTitle: (title) => set({ title }),

  setOutingType: (outingType) => set({ outingType }),

  setDays: (days) =>
    set((state) => {
      const sorted = [...days].sort();
      return { days: sorted, slots: syncSlotsWithDays(sorted, state.slots) };
    }),

  setSlot: (day, range) => set((state) => ({ slots: { ...state.slots, [day]: range } })),

  setInviteeIds: (inviteeIds) => set({ inviteeIds }),

  nextStep: () =>
    set((state) => ({ stepIndex: Math.min(state.stepIndex + 1, CREATION_STEPS.length - 1) })),

  previousStep: () => set((state) => ({ stepIndex: Math.max(state.stepIndex - 1, 0) })),

  reset: () => set(INITIAL_DRAFT),
}));

// Draft of the logged-in user: cleared on logout.
registerUserScopedStore(useOutingCreationStore);
