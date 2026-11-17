import { ActivityVote } from '@/shared/types';
import { ActivityResult, ActivityVoteEntry, OutingActivity } from '../types/activities';

/** Points of each vote used to rank the activities. */
export const VOTE_POINTS: Record<ActivityVote, number> = { accepted: 2, maybe: 1 };

/** Maximum lengths enforced by the database. */
export const ACTIVITY_TITLE_MAX_LENGTH = 120;
export const ACTIVITY_NOTE_MAX_LENGTH = 300;

/** Score, voters and current user's vote of one activity. */
export const computeActivityResult = (
  activity: OutingActivity,
  votes: ReadonlyArray<ActivityVoteEntry>,
  currentUserId: string | null,
): ActivityResult => {
  const own = votes.filter((entry) => entry.activityId === activity.id);
  const acceptedUserIds = own.filter((e) => e.vote === 'accepted').map((e) => e.userId);
  const maybeUserIds = own.filter((e) => e.vote === 'maybe').map((e) => e.userId);
  return {
    activity,
    acceptedUserIds,
    maybeUserIds,
    score:
      acceptedUserIds.length * VOTE_POINTS.accepted + maybeUserIds.length * VOTE_POINTS.maybe,
    myVote: own.find((e) => e.userId === currentUserId)?.vote ?? null,
  };
};

/**
 * The pool, best score first (ties keep the proposal order).
 * @param activities activities of the pool.
 * @param votes every vote of the outing.
 * @param currentUserId the user whose own vote is returned in `myVote`.
 */
export const rankActivities = (
  activities: ReadonlyArray<OutingActivity>,
  votes: ReadonlyArray<ActivityVoteEntry>,
  currentUserId: string | null,
): ActivityResult[] =>
  activities
    .map((activity) => computeActivityResult(activity, votes, currentUserId))
    .sort((a, b) => b.score - a.score || a.activity.createdAt.localeCompare(b.activity.createdAt));

/** The vote to send when tapping `tapped`: tapping the current vote again removes it. */
export const nextVote = (current: ActivityVote | null, tapped: ActivityVote): ActivityVote | null =>
  current === tapped ? null : tapped;
