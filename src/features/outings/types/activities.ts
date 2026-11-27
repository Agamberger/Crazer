import { ActivityVote } from '@/shared/types';

/**
 * The saved place (Crazer or Google Maps) an activity happens at. A Google place only stores
 * its place ID: `name` and `address` are then `null` and fetched live (`PlaceNameLabel`).
 */
export interface ActivityPlace {
  id: string;
  name: string | null;
  address: string | null;
  googlePlaceId: string | null;
}

/** An activity of the outing's pool: proposed by an attendee, voted on, placed in the programme. */
export interface OutingActivity {
  id: string;
  outingId: string;
  title: string;
  note: string | null;
  proposedBy: string;
  /** `null` when the activity is not tied to a saved place (or the place is not visible). */
  place: ActivityPlace | null;
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
