import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppModal } from '@/shared/components';
import { useAuth } from '@/features/auth';
import { useOutingsStore } from '@/features/outings/store/useOutingsStore';
import { useVisibleOutings } from '@/features/outings/hooks/useVisibleOutings';
import { toast } from '@/shared/store/useToastStore';
import { OutingRow, PlannedOutingInsert, PlannedOutingRow } from '@/shared/types';
import { ensurePlaceExists } from '../services/placeService';
import { useMapStore } from '../store/useMapStore';
import { PlaceItem } from '../types/carte';
import { OutingPickerStep } from './OutingPickerStep';
import { PlaceSummaryBanner } from './PlaceSummaryBanner';
import { PlannedStepValues } from './PlannedStepForm';
import { PlannedStepEditStep } from './PlannedStepEditStep';

export interface AddPlaceToOutingModalProps {
  visible: boolean;
  place: PlaceItem | null;
  onClose: () => void;
  onSuccess?: (outing: OutingRow, plannedOuting: PlannedOutingRow) => void;
  initialOuting?: OutingRow | null;
  targetOutingId?: string | null;
  /**
   * « Nouvelle sortie » : ouvre l'assistant de création autour de ce lieu.
   * Une erreur levée est affichée dans la modale ; en cas de succès, la modale se ferme.
   */
  onCreateNewOuting: (place: PlaceItem) => Promise<void> | void;
}

const isActiveOuting = (outing: OutingRow) =>
  outing.status !== 'done' && outing.status !== 'cancelled';

export const AddPlaceToOutingModal: React.FC<AddPlaceToOutingModalProps> = ({
  visible,
  place,
  onClose,
  onSuccess,
  initialOuting,
  targetOutingId: propTargetOutingId,
  onCreateNewOuting,
}) => {
  const { user } = useAuth();
  const outings = useVisibleOutings();
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const addPlannedOuting = useOutingsStore((state) => state.addPlannedOuting);
  const storeTargetOutingId = useMapStore((state) => state.targetOutingId);
  const effectiveTargetId = propTargetOutingId ?? storeTargetOutingId;

  const [selectedOuting, setSelectedOuting] = useState<OutingRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingOuting, setIsCreatingOuting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Les erreurs restent dans la modale : un toast serait masqué par la Modal plein écran.
  const [createError, setCreateError] = useState<string | null>(null);
  const prevVisibleRef = useRef(false);

  const selectOuting = useCallback((outing: OutingRow | null) => {
    setSelectedOuting(outing);
    setSubmitError(null);
    setCreateError(null);
  }, []);

  // À l'ouverture : sortie imposée (prop ou cible de la carte) sinon choix de la sortie
  useEffect(() => {
    const wasJustOpened = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (!wasJustOpened || !place) return;

    fetchOutings();
    const targeted =
      initialOuting ??
      (effectiveTargetId
        ? useOutingsStore.getState().outings.find((o) => o.id === effectiveTargetId)
        : undefined);
    selectOuting(targeted ?? null);
  }, [visible, place, initialOuting, effectiveTargetId, fetchOutings, selectOuting]);

  const handleClose = () => {
    selectOuting(null);
    onClose();
  };

  const handleCreateNewOuting = async () => {
    if (!place) return;
    setCreateError(null);
    setIsCreatingOuting(true);
    try {
      await onCreateNewOuting(place);
      handleClose();
    } catch {
      setCreateError("Impossible de préparer la nouvelle sortie. Réessaie dans un instant.");
    } finally {
      setIsCreatingOuting(false);
    }
  };

  const handleSavePlannedOuting = async (values: PlannedStepValues) => {
    if (!selectedOuting || !place) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. S'assurer que le lieu existe dans Supabase
      const placeId = await ensurePlaceExists(place, user?.id);

      // 2. Créer l'étape liée à la sortie et au lieu
      const payload: PlannedOutingInsert = {
        outing_id: selectedOuting.id,
        place_id: placeId,
        created_by: user?.id || selectedOuting.created_by,
        title: values.title.trim(),
        description: values.description.trim() || null,
        notes: values.notes.trim() || null,
        scheduled_for: values.scheduledFor.toISOString(),
        duration_min: values.durationMin && values.durationMin > 0 ? values.durationMin : null,
        status: values.status,
      };

      const newPlanned = await addPlannedOuting(payload);
      if (newPlanned) {
        toast.success(
          `Le lieu "${place.title}" a bien été ajouté à la sortie "${selectedOuting.title}".`,
          { title: 'Étape ajoutée !' },
        );
        onSuccess?.(selectedOuting, newPlanned);
        handleClose();
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'étape",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!place) return null;

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      variant="fullScreen"
      title={selectedOuting ? "Planifier l'étape" : 'Ajouter à une sortie'}
      closeButtonTestID="btn-close-add-modal"
      testID="modal-add-poi-to-outing"
    >
      <PlaceSummaryBanner place={place} />

      {selectedOuting ? (
        <PlannedStepEditStep
          outing={selectedOuting}
          place={place}
          onChangeOuting={() => selectOuting(null)}
          onSubmit={handleSavePlannedOuting}
          isSubmitting={isSubmitting}
          error={submitError}
        />
      ) : (
        <OutingPickerStep
          outings={outings.filter(isActiveOuting)}
          onSelectOuting={selectOuting}
          onCreateOuting={handleCreateNewOuting}
          isCreatingOuting={isCreatingOuting}
          error={createError}
        />
      )}
    </AppModal>
  );
};
