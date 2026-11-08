import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '@/features/auth';
import { useFriendsStore } from '@/features/profil';
import { toast } from '@/shared/store/useToastStore';
import { CREATION_STEPS, CreationStep, useOutingCreationStore } from '../store/useOutingCreationStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { areSlotsValid, getFirstStepDate } from '../utils/availabilityUtils';

/** A saved place the outing is created around (it becomes the first step). */
export interface WizardPlace {
  id: string;
  name: string;
}

/** Default length of the first step created from a place. */
const PLACE_STEP_DURATION_MIN = 60;

/** State and actions of the creation wizard (steps 1 to 4 of « Créer la sortie »). */
export const useCreateOutingWizard = (
  onCreated: (outingId: string) => void,
  place: WizardPlace | null = null,
) => {
  const { user } = useAuth();
  // The wizard renders every draft field, so it subscribes to the whole draft (shallow-compared).
  const draft = useOutingCreationStore(useShallow((state) => state));
  const friends = useFriendsStore((state) => state.friends);
  const isLoadingFriends = useFriendsStore((state) => state.isLoading);
  const fetchFriendsList = useFriendsStore((state) => state.fetchFriendsList);
  const createOutingWithInvites = useOutingSchedulingStore((s) => s.createOutingWithInvites);
  const isSubmitting = useOutingSchedulingStore((s) => s.isSubmitting);

  const addPlannedOuting = useOutingsStore((state) => state.addPlannedOuting);
  const placeId = place?.id;
  const placeName = place?.name;

  const step: CreationStep = CREATION_STEPS[draft.stepIndex];
  const isLastStep = draft.stepIndex === CREATION_STEPS.length - 1;

  useEffect(() => {
    if (user?.id) void fetchFriendsList(user.id);
  }, [user?.id, fetchFriendsList]);

  // Opened from a place: start a fresh draft named after the place.
  useEffect(() => {
    if (!placeId) return;
    const { reset, setTitle } = useOutingCreationStore.getState();
    reset();
    setTitle(placeName ?? '');
  }, [placeId, placeName]);

  const canContinue = (() => {
    switch (step) {
      case 'name':
        return draft.title.trim().length > 0;
      case 'type':
        return draft.outingType !== null;
      case 'days':
        return draft.days.length > 0;
      case 'availability':
        return areSlotsValid(draft.days, draft.slots);
      default:
        return true;
    }
  })();

  /** The place becomes the first step; a failure must not hide that the outing was created. */
  const addPlaceStep = async (outingId: string, target: WizardPlace, userId: string) => {
    try {
      await addPlannedOuting({
        outing_id: outingId,
        place_id: target.id,
        title: target.name,
        scheduled_for: getFirstStepDate(draft.days, draft.slots),
        duration_min: PLACE_STEP_DURATION_MIN,
        status: 'pending',
        created_by: userId,
      });
    } catch {
      toast.warning("La sortie est créée, mais le lieu n'a pas pu être ajouté comme étape.", {
        title: target.name,
      });
    }
  };

  const submit = async () => {
    try {
      const outingId = await createOutingWithInvites({
        title: draft.title,
        outingType: draft.outingType,
        days: draft.days,
        slots: draft.slots,
        inviteeIds: draft.inviteeIds,
      });
      if (place && user?.id) {
        await addPlaceStep(outingId, place, user.id);
      }
      const count = draft.inviteeIds.length;
      toast.success(
        count > 0
          ? `Invitation envoyée à ${count} ami${count > 1 ? 's' : ''}.`
          : 'Sortie créée.',
        { title: draft.title.trim() },
      );
      draft.reset();
      onCreated(outingId);
    } catch {
      toast.error('Impossible de créer la sortie. Réessaie dans un instant.', { title: 'Erreur' });
    }
  };

  const next = () => {
    if (!canContinue) return;
    if (isLastStep) void submit();
    else draft.nextStep();
  };

  return {
    draft,
    step,
    friends,
    isLoadingFriends,
    isSubmitting,
    isLastStep,
    canContinue,
    next,
  };
};
