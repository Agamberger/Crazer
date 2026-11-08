import { useEffect } from 'react';
import { OutingRow } from '@/shared/types';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { OutingMember } from '../types/scheduling';

const NO_MEMBERS: OutingMember[] = [];

/** Participants of an outing (loaded once per outing, `[]` while loading or without outing). */
export const useOutingMembers = (outing: Pick<OutingRow, 'id' | 'created_by'> | null): OutingMember[] => {
  const fetchScheduling = useOutingSchedulingStore((state) => state.fetchScheduling);
  const members = useOutingSchedulingStore((state) =>
    outing ? state.schedulingByOutingId[outing.id]?.members : undefined,
  );
  const outingId = outing?.id;
  const organizerId = outing?.created_by;

  useEffect(() => {
    if (outingId && organizerId) void fetchScheduling({ id: outingId, created_by: organizerId });
  }, [outingId, organizerId, fetchScheduling]);

  return members ?? NO_MEMBERS;
};
