import { useMemo } from 'react';
import { OutingRow } from '@/shared/types';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';

/** Removes the outings the user does not attend: pending invitations and declined ones. */
export const filterAttendedOutings = (
  outings: ReadonlyArray<OutingRow>,
  nonAttendingOutingIds: ReadonlyArray<string>,
): OutingRow[] => outings.filter((outing) => !nonAttendingOutingIds.includes(outing.id));

/**
 * The user's outings, minus the ones they have only been invited to (shown as invitations)
 * or declined. Use it for every list of « my outings ».
 */
export const useVisibleOutings = (): OutingRow[] => {
  const outings = useOutingsStore((state) => state.outings);
  const nonAttendingOutingIds = useOutingSchedulingStore((state) => state.nonAttendingOutingIds);
  return useMemo(
    () => filterAttendedOutings(outings, nonAttendingOutingIds),
    [outings, nonAttendingOutingIds],
  );
};
