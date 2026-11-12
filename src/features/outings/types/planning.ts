import { PlannedOutingRow } from '@/shared/types';
import { OutingActivity } from './activities';
import { DayKey, OutingMember } from './scheduling';

/**
 * How a member's availability of the day covers a step:
 * - `present`: available for the whole step;
 * - `arrivesLate`: joins during the step (late arrival);
 * - `leavesEarly`: leaves during the step;
 * - `partial`: joins after the start and leaves before the end;
 * - `absent`: not available at all during the step (or no slot that day).
 */
export type AttendanceKind = 'present' | 'arrivesLate' | 'leavesEarly' | 'partial' | 'absent';

/** One member's attendance at one step. */
export interface StepAttendance {
  member: OutingMember;
  kind: AttendanceKind;
  /** `HH:mm` arrival when the member joins during the step. */
  arrival: string | null;
  /** `HH:mm` departure when the member leaves during the step. */
  departure: string | null;
}

/** What happens between two consecutive steps. */
export type PlanningGap =
  | { kind: 'travel'; minutes: number }
  | { kind: 'overlap'; minutes: number }
  | { kind: 'none' };

/** A step of the day with its computed times, attendance and the gap before it. */
export interface PlanningStepView {
  step: PlannedOutingRow;
  /** `HH:mm` local start. */
  start: string;
  /** `HH:mm` local end (`start` + duration). */
  end: string;
  durationMin: number;
  attendance: StepAttendance[];
  /** Members who do not attend the whole step (warning shown on the card). */
  warnings: StepAttendance[];
  /** Gap between the previous step's end and this step's start; `none` for the first step. */
  gapBefore: PlanningGap;
}

/** The planning of one day of an outing. */
export interface DayPlanning {
  day: DayKey;
  steps: PlanningStepView[];
  /** Retained activities of the day (or of « any day ») not placed yet. */
  unplacedActivities: OutingActivity[];
  /** `HH:mm` start suggested from everyone's availability. */
  suggestedStart: string;
}

/** New time (and duration) of an existing step. */
export interface StepSchedule {
  id: string;
  scheduledFor: string;
  durationMin: number;
}

/** A retained activity to turn into a step. */
export interface ActivityPlacement {
  activityId: string;
  scheduledFor: string;
  durationMin: number;
}

/** Everything to save to apply a schedule to a day. */
export interface PlanningChanges {
  reschedule: StepSchedule[];
  placements: ActivityPlacement[];
}

/** Direction of a step move in the organizer's ordering. */
export type MoveDirection = 'up' | 'down';
