import { useState } from 'react';
import { useAuth } from '@/features/auth';
import { toast } from '@/shared/store/useToastStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';

/** A saved place the outing is created around (it becomes the first step). */
export interface CreationPlace {
  id: string;
  name: string;
}

/** Default length of the first step created from a place. */
const PLACE_STEP_DURATION_MIN = 60;

export interface UseCreateOutingResult {
  title: string;
  setTitle: (title: string) => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  submit: () => Promise<void>;
}

/**
 * Creation of an outing from its name only; the rest is completed from the outing hub.
 * @param onCreated called with the id of the new outing.
 * @param place place the outing is created around (prefills the name, becomes the first step).
 * @param initialTitle name the field starts with (e.g. a not retained activity).
 */
export const useCreateOuting = (
  onCreated: (outingId: string) => void,
  place: CreationPlace | null = null,
  initialTitle?: string,
): UseCreateOutingResult => {
  const { user } = useAuth();
  const createOutingWithInvites = useOutingSchedulingStore((s) => s.createOutingWithInvites);
  const isSubmitting = useOutingSchedulingStore((s) => s.isSubmitting);
  const addPlannedOuting = useOutingsStore((state) => state.addPlannedOuting);
  const [title, setTitle] = useState(initialTitle ?? place?.name ?? '');

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  /** The place becomes the first step; a failure must not hide that the outing was created. */
  const addPlaceStep = async (outingId: string, target: CreationPlace, userId: string) => {
    try {
      await addPlannedOuting({
        outing_id: outingId,
        place_id: target.id,
        title: target.name,
        scheduled_for: new Date().toISOString(),
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
    if (!canSubmit) return;
    try {
      const outingId = await createOutingWithInvites({
        title,
        outingType: null,
        days: [],
        slots: {},
        inviteeIds: [],
      });
      if (place && user?.id) await addPlaceStep(outingId, place, user.id);
      onCreated(outingId);
    } catch {
      toast.error('Impossible de créer la sortie. Réessaie dans un instant.', { title: 'Erreur' });
    }
  };

  return { title, setTitle, canSubmit, isSubmitting, submit };
};
