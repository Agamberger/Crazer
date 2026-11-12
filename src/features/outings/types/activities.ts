import { ActivityVote } from '@/shared/types';
import { DayKey } from './scheduling';

/** The saved place (Crazer or imported from Google Maps) an activity happens at. */
export interface ActivityPlace {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
}

/** An activity proposed for an outing, for one candidate day or for any day. */
export interface OutingActivity {
  id: string;
  outingId: string;
  /** `null` = proposed for the whole outing. */
  day: DayKey | null;
  title: string;
  note: string | null;
  proposedBy: string;
  /** `null` when the activity is not tied to a saved place (or the place is not visible). */
  place: ActivityPlace | null;
  /** Set by the organizer once the group is settled. */
  chosen: boolean;
  createdAt: string;
}

/** A member's vote on an activity (no entry = no vote). */
export interface ActivityVoteEntry {
  activityId: string;
  userId: string;
  vote: ActivityVote;
}

/** Everything loaded for the activities of one outing. */
export interface OutingActivities {
  activities: OutingActivity[];
  votes: ActivityVoteEntry[];
}

/** Live result of one activity. */
export interface ActivityResult {
  activity: OutingActivity;
  acceptedUserIds: string[];
  maybeUserIds: string[];
  /** accepted = 2 points, maybe = 1 point. */
  score: number;
  myVote: ActivityVote | null;
}

/**
 * - `empty`: no activity proposed;
 * - `voting`: votes are open and there is no tie at the top;
 * - `tie`: several activities share the best (positive) score and none is chosen;
 * - `decided`: the organizer chose one activity.
 */
export type ActivityGroupState = 'empty' | 'voting' | 'tie' | 'decided';

/** Activities of one day (or of « any day » when `day` is `null`). */
export interface ActivityGroup {
  day: DayKey | null;
  /** Best score first; ties keep the proposal order. */
  results: ActivityResult[];
  state: ActivityGroupState;
  /** Results sharing the best score when `state` is `tie`, `[]` otherwise. */
  tiedResults: ActivityResult[];
  chosenResult: ActivityResult | null;
}
