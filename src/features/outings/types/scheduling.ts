import { TimeRange } from '@/shared/components';
import { OutingRow, ParticipantStatus } from '@/shared/types';

/** Local calendar day, formatted `YYYY-MM-DD`. */
export type DayKey = string;

/** One availability slot for one day (`HH:mm` times). */
export interface AvailabilitySlot extends TimeRange {
  day: DayKey;
}

/** A member's availability slot, as stored in `outing_availabilities`. */
export interface MemberAvailability extends AvailabilitySlot {
  userId: string;
}

/** A participant of an outing, with the profile data needed by the UI. */
export interface OutingMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: ParticipantStatus;
  isOrganizer: boolean;
}

/** Live recap of one candidate day: who is available and the common slot. */
export interface DayRecap {
  day: DayKey;
  availableMembers: OutingMember[];
  /** Intersection of the available members' slots, `null` when they do not overlap. */
  commonSlot: TimeRange | null;
}

/** Everything needed to display the scheduling of one outing. */
export interface OutingScheduling {
  days: DayKey[];
  availabilities: MemberAvailability[];
  members: OutingMember[];
}

/** A pending invitation received by the current user. */
export interface OutingInvitation {
  outing: OutingRow;
  organizerName: string;
  invitedAt: string;
}

/** Data collected by the creation wizard. */
export interface OutingDraft {
  title: string;
  days: DayKey[];
  slots: Record<DayKey, TimeRange>;
  inviteeIds: string[];
}
