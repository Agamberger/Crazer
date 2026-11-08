import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useMapStore } from '@/features/carte/store/useMapStore';
import { PlannedOutingRow } from '@/shared/types';
import { useOutingsStore } from '../store/useOutingsStore';

export interface UseOutingPlannedOutingsOptions {
  /** Steps supplied by the parent: when set, the store is neither fetched nor read. */
  plannedOutings?: PlannedOutingRow[];
  onAddPlannedOuting?: () => Promise<void> | void;
  onAddFromMap?: () => void;
  onSelectPlannedOuting?: (plannedOuting: PlannedOutingRow) => void;
}

export interface UseOutingPlannedOutingsResult {
  plannedOutings: PlannedOutingRow[];
  isLoading: boolean;
  addPlannedOuting: () => Promise<void>;
  addFromMap: () => void;
  selectPlannedOuting: (plannedOuting: PlannedOutingRow) => void;
}

/**
 * Steps (planned outings) of an outing being edited. Each callback passed in options overrides
 * the default store / navigation behaviour: create "Étape N", target the outing on the map,
 * select the step in the store.
 */
export function useOutingPlannedOutings(
  outingId: string,
  {
    plannedOutings: propPlannedOutings,
    onAddPlannedOuting,
    onAddFromMap,
    onSelectPlannedOuting,
  }: UseOutingPlannedOutingsOptions = {},
): UseOutingPlannedOutingsResult {
  const router = useRouter();
  const storePlannedOutings = useOutingsStore((state) => state.plannedOutings);
  const fetchPlannedOutings = useOutingsStore((state) => state.fetchPlannedOutings);
  const createPlannedOuting = useOutingsStore((state) => state.createPlannedOuting);
  const setSelectedPlannedOutingId = useOutingsStore((state) => state.setSelectedPlannedOutingId);
  const isLoadingPlannedOutings = useOutingsStore((state) => state.isLoadingPlannedOutings);

  useEffect(() => {
    if (!propPlannedOutings && outingId) {
      fetchPlannedOutings(outingId);
    }
  }, [outingId, propPlannedOutings, fetchPlannedOutings]);

  const plannedOutings =
    propPlannedOutings ?? storePlannedOutings.filter((p) => p.outing_id === outingId);

  const addPlannedOuting = async () => {
    if (onAddPlannedOuting) {
      await onAddPlannedOuting();
    } else {
      const newPlanned = await createPlannedOuting(outingId, {
        title: `Étape ${plannedOutings.length + 1}`,
      });
      if (onSelectPlannedOuting && newPlanned) {
        onSelectPlannedOuting(newPlanned);
      }
    }
  };

  const addFromMap = () => {
    if (onAddFromMap) {
      onAddFromMap();
    } else {
      useMapStore.getState().setTargetOutingId(outingId);
      router.push('/(tabs)/carte');
    }
  };

  const selectPlannedOuting = (plannedOuting: PlannedOutingRow) => {
    if (onSelectPlannedOuting) {
      onSelectPlannedOuting(plannedOuting);
    } else {
      setSelectedPlannedOutingId(plannedOuting.id);
    }
  };

  return {
    plannedOutings,
    isLoading: !propPlannedOutings && isLoadingPlannedOutings,
    addPlannedOuting,
    addFromMap,
    selectPlannedOuting,
  };
}
