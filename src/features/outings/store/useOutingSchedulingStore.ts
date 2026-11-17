import { create } from 'zustand';
import { bindSetToSession, registerUserScopedStore } from '@/shared/store/sessionReset';
import { OutingRow, ParticipantStatus } from '@/shared/types';
import { outingSchedulingService } from '../services/outingSchedulingService';
import {
  AvailabilitySlot,
  DayKey,
  OutingDraft,
  OutingInvitation,
  OutingScheduling,
} from '../types/scheduling';
import { slotsToPayload } from '../utils/availabilityUtils';
import { useOutingsStore } from './useOutingsStore';

export type InvitationResponse = Exclude<ParticipantStatus, 'invited'>;

interface OutingSchedulingState {
  invitations: OutingInvitation[];
  /** Outings the user is linked to without attending: pending invitation or declined. */
  nonAttendingOutingIds: string[];
  isLoadingInvitations: boolean;
  schedulingByOutingId: Record<string, OutingScheduling>;
  isLoadingScheduling: boolean;
  isSubmitting: boolean;
  error: string | null;

  fetchInvitations: (userId: string) => Promise<OutingInvitation[]>;
  fetchScheduling: (
    outing: Pick<OutingRow, 'id' | 'created_by'>,
  ) => Promise<OutingScheduling | null>;
  /** Creates the outing from the wizard draft. Throws on failure; returns the new outing id. */
  createOutingWithInvites: (draft: OutingDraft) => Promise<string>;
  /**
   * Invites friends to an existing outing (organizer) and refreshes its members.
   * Throws on failure; resolves with the number of newly invited friends.
   */
  inviteFriends: (
    outing: Pick<OutingRow, 'id' | 'created_by'>,
    inviteeIds: string[],
  ) => Promise<number>;
  /** Replaces the candidate days (organizer) and refreshes the scheduling. Throws on failure. */
  saveDays: (outing: Pick<OutingRow, 'id' | 'created_by'>, days: DayKey[]) => Promise<void>;
  /** Replaces the current attendee's slots and refreshes the scheduling. Throws on failure. */
  saveMySlots: (
    outing: Pick<OutingRow, 'id' | 'created_by'>,
    slots: AvailabilitySlot[],
  ) => Promise<void>;
  /** Answers an invitation. Throws on failure. */
  respondToInvitation: (
    outingId: string,
    response: InvitationResponse,
    slots: AvailabilitySlot[],
  ) => Promise<void>;
}

const withoutId = (ids: string[], id: string): string[] => ids.filter((v) => v !== id);

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

/** Runs a scheduling change, then reloads the outing's scheduling; keeps the error on failure. */
const mutateScheduling = async (
  outing: Pick<OutingRow, 'id' | 'created_by'>,
  fallback: string,
  action: () => Promise<void>,
): Promise<void> => {
  const setLive = bindSetToSession(useOutingSchedulingStore.setState);
  setLive({ isSubmitting: true, error: null });
  try {
    await action();
    await useOutingSchedulingStore.getState().fetchScheduling(outing);
    setLive({ isSubmitting: false });
  } catch (err: unknown) {
    setLive({ error: errorMessage(err, fallback), isSubmitting: false });
    throw err;
  }
};

export const useOutingSchedulingStore = create<OutingSchedulingState>((set, get) => ({
  invitations: [],
  nonAttendingOutingIds: [],
  isLoadingInvitations: false,
  schedulingByOutingId: {},
  isLoadingScheduling: false,
  isSubmitting: false,
  error: null,

  fetchInvitations: async (userId) => {
    // Ignore responses arriving after a logout (next account).
    const setLive = bindSetToSession(set);
    setLive({ isLoadingInvitations: true, error: null });
    try {
      const [invitations, nonAttendingOutingIds] = await Promise.all([
        outingSchedulingService.fetchMyInvitations(userId),
        outingSchedulingService.fetchMyNonAttendingOutingIds(userId),
      ]);
      setLive({ invitations, nonAttendingOutingIds, isLoadingInvitations: false });
      return invitations;
    } catch (err: unknown) {
      setLive({
        error: errorMessage(err, 'Erreur lors du chargement des invitations'),
        isLoadingInvitations: false,
      });
      return [];
    }
  },

  fetchScheduling: async (outing) => {
    const setLive = bindSetToSession(set);
    setLive({ isLoadingScheduling: true, error: null });
    try {
      const [days, availabilities, members] = await Promise.all([
        outingSchedulingService.fetchOutingDays(outing.id),
        outingSchedulingService.fetchAvailabilities(outing.id),
        outingSchedulingService.fetchMembers(outing.id, outing.created_by),
      ]);
      const scheduling: OutingScheduling = { days, availabilities, members };
      setLive((state) => ({
        schedulingByOutingId: { ...state.schedulingByOutingId, [outing.id]: scheduling },
        isLoadingScheduling: false,
      }));
      return scheduling;
    } catch (err: unknown) {
      setLive({
        error: errorMessage(err, 'Erreur lors du chargement des disponibilités'),
        isLoadingScheduling: false,
      });
      return null;
    }
  },

  createOutingWithInvites: async (draft) => {
    const setLive = bindSetToSession(set);
    setLive({ isSubmitting: true, error: null });
    try {
      const slots = slotsToPayload(draft.days, draft.slots);
      const outingId = await outingSchedulingService.createOutingWithInvites({
        title: draft.title.trim(),
        outingType: draft.outingType,
        days: [...draft.days].sort(),
        slots,
        inviteeIds: draft.inviteeIds,
      });
      await useOutingsStore.getState().fetchOutingById(outingId);
      setLive({ isSubmitting: false });
      return outingId;
    } catch (err: unknown) {
      setLive({
        error: errorMessage(err, 'Erreur lors de la création de la sortie'),
        isSubmitting: false,
      });
      throw err;
    }
  },

  inviteFriends: async (outing, inviteeIds) => {
    const setLive = bindSetToSession(set);
    setLive({ isSubmitting: true, error: null });
    try {
      const invitedCount = await outingSchedulingService.inviteToOuting(outing.id, inviteeIds);
      await get().fetchScheduling(outing);
      setLive({ isSubmitting: false });
      return invitedCount;
    } catch (err: unknown) {
      setLive({
        error: errorMessage(err, 'Erreur lors de l’envoi des invitations'),
        isSubmitting: false,
      });
      throw err;
    }
  },

  saveDays: (outing, days) =>
    mutateScheduling(outing, 'Erreur lors de l’enregistrement des jours', () =>
      outingSchedulingService.setOutingDays(outing.id, [...days].sort()),
    ),

  saveMySlots: (outing, slots) =>
    mutateScheduling(outing, 'Erreur lors de l’enregistrement des dispos', () =>
      outingSchedulingService.setMySlots(outing.id, slots),
    ),

  respondToInvitation: async (outingId, response, slots) => {
    const setLive = bindSetToSession(set);
    setLive({ isSubmitting: true, error: null });
    try {
      await outingSchedulingService.respondToInvitation(outingId, response, slots);
      setLive((state) => ({
        invitations: state.invitations.filter((inv) => inv.outing.id !== outingId),
        nonAttendingOutingIds:
          response === 'declined'
            ? [...withoutId(state.nonAttendingOutingIds, outingId), outingId]
            : withoutId(state.nonAttendingOutingIds, outingId),
        isSubmitting: false,
      }));
      if (response !== 'declined') {
        await useOutingsStore.getState().fetchOutingById(outingId);
      }
    } catch (err: unknown) {
      setLive({
        error: errorMessage(err, 'Erreur lors de la réponse à l’invitation'),
        isSubmitting: false,
      });
      throw err;
    }
  },
}));

// Data of the logged-in account: cleared on logout.
registerUserScopedStore(useOutingSchedulingStore);
