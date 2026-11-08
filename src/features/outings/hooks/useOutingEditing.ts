import { useEffect } from 'react';
import { toast } from '@/shared/store/useToastStore';
import { OutingUpdate, PlannedOutingUpdate } from '@/shared/types';
import { useOutingsStore } from '../store/useOutingsStore';

/**
 * Edition flow of the Sorties tab: selected outing / step, loading of the outing steps and the
 * save / delete / cancel handlers. Store actions return null / false on failure (message in
 * `error`): the form then stays open so the input is not lost.
 */
export function useOutingEditing() {
  const updateOuting = useOutingsStore((state) => state.updateOuting);
  const selectedOutingId = useOutingsStore((state) => state.selectedOutingId);
  const selectOuting = useOutingsStore((state) => state.selectOuting);
  const selectedPlannedOutingId = useOutingsStore((state) => state.selectedPlannedOutingId);
  const selectPlannedOuting = useOutingsStore((state) => state.selectPlannedOuting);
  const plannedOutings = useOutingsStore((state) => state.plannedOutings);
  const fetchPlannedOutings = useOutingsStore((state) => state.fetchPlannedOutings);
  const updatePlannedOuting = useOutingsStore((state) => state.updatePlannedOuting);
  const deletePlannedOuting = useOutingsStore((state) => state.deletePlannedOuting);
  const isLoadingPlannedOutings = useOutingsStore((state) => state.isLoadingPlannedOutings);

  useEffect(() => {
    if (selectedOutingId && !selectedPlannedOutingId) {
      fetchPlannedOutings(selectedOutingId);
    }
  }, [selectedOutingId, selectedPlannedOutingId, fetchPlannedOutings]);

  const handleUpdateOuting = async (updates: OutingUpdate) => {
    if (!selectedOutingId) return;
    const updated = await updateOuting(selectedOutingId, updates);
    if (updated) selectOuting(null);
  };

  const handleCancelEdit = () => {
    selectOuting(null);
  };

  const handleUpdatePlannedOuting = async (updates: PlannedOutingUpdate) => {
    if (!selectedPlannedOutingId) return;
    const updated = await updatePlannedOuting(selectedPlannedOutingId, updates);
    if (updated) selectPlannedOuting(null);
  };

  const handleDeletePlannedOuting = async () => {
    if (!selectedPlannedOutingId) return;
    const deleted = await deletePlannedOuting(selectedPlannedOutingId);
    if (deleted) {
      selectPlannedOuting(null);
    } else {
      toast.error("Impossible de supprimer l'étape. Réessaie dans un instant.", {
        title: 'Erreur',
      });
    }
  };

  const handleCancelPlannedEdit = () => {
    selectPlannedOuting(null);
  };

  return {
    selectedOutingId,
    selectedPlannedOutingId,
    plannedOutings,
    isLoadingPlannedOutings,
    selectOuting,
    selectPlannedOuting,
    handleUpdateOuting,
    handleCancelEdit,
    handleUpdatePlannedOuting,
    handleDeletePlannedOuting,
    handleCancelPlannedEdit,
  };
}
