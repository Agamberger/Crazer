import { OutingRow } from '@/shared/types';
import { buildStartDate, DEFAULT_TIME_RANGE } from '../utils/availabilityUtils';
import { outingSchedulingService } from './outingSchedulingService';
import { outingService } from './outingService';

/**
 * Date a new step of an outing defaults to:
 * the outing's `start_date`; for an undated outing, the first planned step's date, else the
 * first candidate day at the default slot start, else now (also when the lookups fail).
 * Never throws.
 */
export const resolveStepBaseDate = async (
  outing: Pick<OutingRow, 'id' | 'start_date'>,
): Promise<Date> => {
  if (outing.start_date) return new Date(outing.start_date);

  try {
    const [firstStep] = await outingService.fetchPlannedOutings(outing.id);
    if (firstStep) return new Date(firstStep.scheduled_for);

    const [firstDay] = await outingSchedulingService.fetchOutingDays(outing.id);
    if (firstDay) return new Date(buildStartDate(firstDay, DEFAULT_TIME_RANGE.start));
  } catch {
    return new Date();
  }
  return new Date();
};
