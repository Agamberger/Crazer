import { TimeRange } from '@/shared/components';
import { ParticipantStatus } from '@/shared/types';
import {
  AvailabilitySlot,
  DayKey,
  DayRecap,
  MemberAvailability,
  OutingMember,
} from '../types/scheduling';

/** Default slot proposed when a day is selected (evening outing). */
export const DEFAULT_TIME_RANGE: TimeRange = { start: '18:00', end: '23:00' };

/** Statuses whose availabilities count in the recap. */
const ATTENDING_STATUSES: ReadonlyArray<ParticipantStatus> = ['accepted', 'maybe'];

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local date → `YYYY-MM-DD` (no UTC shift). */
export const toDayKey = (date: Date): DayKey =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** `YYYY-MM-DD` → local Date at midnight. */
export const dayKeyToDate = (day: DayKey): Date => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
};

/** `YYYY-MM-DD` → « lun. 10 nov. ». */
export const formatDayLabel = (day: DayKey): string =>
  dayKeyToDate(day).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

/** Postgres `time` (`HH:mm:ss`) → `HH:mm`. */
export const normalizeTime = (time: string): string => time.slice(0, 5);

/** Day + `HH:mm` → ISO timestamp (local time). */
export const buildStartDate = (day: DayKey, time: string): string => {
  const date = dayKeyToDate(day);
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toISOString();
};

/** Intersection of several time ranges, `null` when empty. */
export const intersectTimeRanges = (ranges: ReadonlyArray<TimeRange>): TimeRange | null => {
  if (ranges.length === 0) return null;
  const start = ranges.reduce((max, r) => (r.start > max ? r.start : max), ranges[0].start);
  const end = ranges.reduce((min, r) => (r.end < min ? r.end : min), ranges[0].end);
  return end > start ? { start, end } : null;
};

/** Converts the wizard's per-day slots into the RPC payload, sorted by day. */
export const slotsToPayload = (
  days: ReadonlyArray<DayKey>,
  slots: Record<DayKey, TimeRange>,
): AvailabilitySlot[] =>
  [...days]
    .sort()
    .filter((day) => slots[day] !== undefined)
    .map((day) => ({ day, start: slots[day].start, end: slots[day].end }));

/** Live recap: for each candidate day, who is available and their common slot. */
export const computeDayRecaps = (
  days: ReadonlyArray<DayKey>,
  availabilities: ReadonlyArray<MemberAvailability>,
  members: ReadonlyArray<OutingMember>,
): DayRecap[] => {
  const attending = members.filter((m) => ATTENDING_STATUSES.includes(m.status));

  return [...days].sort().map((day) => {
    const daySlots = availabilities.filter((a) => a.day === day);
    const availableMembers = attending.filter((m) => daySlots.some((s) => s.userId === m.userId));
    const ranges = daySlots
      .filter((s) => availableMembers.some((m) => m.userId === s.userId))
      .map(({ start, end }) => ({ start, end }));
    return { day, availableMembers, commonSlot: intersectTimeRanges(ranges) };
  });
};

/** Number of invitees who have not answered yet. */
export const countPendingResponses = (members: ReadonlyArray<OutingMember>): number =>
  members.filter((m) => m.status === 'invited').length;

/** Every slot of the drafted range must end after it starts. */
export const areSlotsValid = (
  days: ReadonlyArray<DayKey>,
  slots: Record<DayKey, TimeRange>,
): boolean => days.length > 0 && days.every((day) => slots[day] && slots[day].end > slots[day].start);

/** Keeps the slots of kept days and gives the default slot to newly selected days. */
export const syncSlotsWithDays = (
  days: ReadonlyArray<DayKey>,
  slots: Record<DayKey, TimeRange>,
): Record<DayKey, TimeRange> =>
  Object.fromEntries(days.map((day) => [day, slots[day] ?? DEFAULT_TIME_RANGE]));
