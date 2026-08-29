import { useCallback, useEffect } from 'react';
import { useOutingsStore } from '../store/useOutingsStore';
import { useAuth } from '@/features/auth';

export function useOutings() {
  const { user } = useAuth();
  const outings = useOutingsStore((state) => state.outings);
  const isLoading = useOutingsStore((state) => state.isLoading);
  const error = useOutingsStore((state) => state.error);
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const createOutingAction = useOutingsStore((state) => state.createOuting);
  const updateOutingAction = useOutingsStore((state) => state.updateOuting);

  const loadOutings = useCallback(async () => {
    await fetchOutings();
  }, [fetchOutings]);

  const refreshOutings = useCallback(async () => {
    await fetchOutings();
  }, [fetchOutings]);

  const createOuting = useCallback(async () => {
    return await createOutingAction(user?.id);
  }, [createOutingAction, user?.id]);

  useEffect(() => {
    fetchOutings();
  }, [fetchOutings]);

  return {
    outings,
    isLoading,
    error,
    loadOutings,
    refreshOutings,
    createOuting,
    updateOuting: updateOutingAction,
  };
}
