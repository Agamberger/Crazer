import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '@/features/auth';
import { useFriendsStore } from '@/features/profil';
import { toast } from '@/shared/store/useToastStore';
import { CREATION_STEPS, CreationStep, useOutingCreationStore } from '../store/useOutingCreationStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { areSlotsValid } from '../utils/availabilityUtils';

/** State and actions of the creation wizard (steps 1 to 4 of « Créer la sortie »). */
export const useCreateOutingWizard = (onCreated: (outingId: string) => void) => {
  const { user } = useAuth();
  // The wizard renders every draft field, so it subscribes to the whole draft (shallow-compared).
  const draft = useOutingCreationStore(useShallow((state) => state));
  const friends = useFriendsStore((state) => state.friends);
  const isLoadingFriends = useFriendsStore((state) => state.isLoading);
  const fetchFriendsList = useFriendsStore((state) => state.fetchFriendsList);
  const createOutingWithInvites = useOutingSchedulingStore((s) => s.createOutingWithInvites);
  const isSubmitting = useOutingSchedulingStore((s) => s.isSubmitting);

  const step: CreationStep = CREATION_STEPS[draft.stepIndex];
  const isLastStep = draft.stepIndex === CREATION_STEPS.length - 1;

  useEffect(() => {
    if (user?.id) void fetchFriendsList(user.id);
  }, [user?.id, fetchFriendsList]);

  const canContinue = (() => {
    switch (step) {
      case 'name':
        return draft.title.trim().length > 0;
      case 'days':
        return draft.days.length > 0;
      case 'availability':
        return areSlotsValid(draft.days, draft.slots);
      default:
        return true;
    }
  })();

  const submit = async () => {
    try {
      const outingId = await createOutingWithInvites({
        title: draft.title,
        days: draft.days,
        slots: draft.slots,
        inviteeIds: draft.inviteeIds,
      });
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
