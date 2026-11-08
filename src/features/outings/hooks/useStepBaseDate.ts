import { useEffect, useState } from 'react';
import { OutingRow } from '@/shared/types';
import { resolveStepBaseDate } from '../services/stepBaseDate';

/** Default date of a new step of `outing` (see `resolveStepBaseDate`); `null` while it is resolved. */
export const useStepBaseDate = (outing: OutingRow): Date | null => {
  const [resolved, setResolved] = useState<{ outingId: string; date: Date } | null>(null);

  const { id, start_date: startDate } = outing;

  useEffect(() => {
    if (startDate) return undefined;
    let cancelled = false;
    void resolveStepBaseDate({ id, start_date: startDate }).then((date) => {
      if (!cancelled) setResolved({ outingId: id, date });
    });
    return () => {
      cancelled = true;
    };
  }, [id, startDate]);

  if (outing.start_date) return new Date(outing.start_date);
  return resolved?.outingId === outing.id ? resolved.date : null;
};
