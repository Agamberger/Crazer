import { ActivityVote } from '@/shared/types';
import {
  ActivityGroup,
  ActivityGroupState,
  ActivityResult,
  ActivityVoteEntry,
  OutingActivity,
} from '../types/activities';
import { DayKey } from '../types/scheduling';

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

const groupState = (results: ActivityResult[], tiedCount: number): ActivityGroupState => {
  if (results.length === 0) return 'empty';
  if (results.some((r) => r.activity.chosen)) return 'decided';
  return tiedCount > 1 ? 'tie' : 'voting';
};

/** Ranks the activities of one day group and detects a tie or a decision. */
export const computeActivityGroup = (
  day: DayKey | null,
  activities: ReadonlyArray<OutingActivity>,
  votes: ReadonlyArray<ActivityVoteEntry>,
  currentUserId: string | null,
): ActivityGroup => {
  const results = activities
    .filter((activity) => activity.day === day)
    .map((activity) => computeActivityResult(activity, votes, currentUserId))
    .sort((a, b) => b.score - a.score || a.activity.createdAt.localeCompare(b.activity.createdAt));

  const bestScore = results[0]?.score ?? 0;
  const tied = bestScore > 0 ? results.filter((r) => r.score === bestScore) : [];
  const state = groupState(results, tied.length);

  return {
    day,
    results,
    state,
    tiedResults: state === 'tie' ? tied : [],
    chosenResult: results.find((r) => r.activity.chosen) ?? null,
  };
};

/**
 * One group per candidate day, plus the « any day » group when it holds activities.
 * Days without activity are kept so that members can propose one for them.
 */
export const computeActivityGroups = (
  days: ReadonlyArray<DayKey>,
  activities: ReadonlyArray<OutingActivity>,
  votes: ReadonlyArray<ActivityVoteEntry>,
  currentUserId: string | null,
): ActivityGroup[] => {
  const groups = [...days]
    .sort()
    .map((day) => computeActivityGroup(day, activities, votes, currentUserId));
  const general = computeActivityGroup(null, activities, votes, currentUserId);
  return general.state === 'empty' ? groups : [general, ...groups];
};

/** The vote to send when tapping `tapped`: tapping the current vote again removes it. */
export const nextVote = (current: ActivityVote | null, tapped: ActivityVote): ActivityVote | null =>
  current === tapped ? null : tapped;

/**
 * Indices highlighted one after the other by the tie-break draw. It loops over the
 * candidates for `loops` rounds and always stops on `winnerIndex`.
 */
export const buildDrawSequence = (
  candidateCount: number,
  winnerIndex: number,
  loops: number,
): number[] => {
  if (candidateCount <= 0) return [];
  const sequence: number[] = [];
  for (let step = 0; step < candidateCount * loops; step += 1) sequence.push(step % candidateCount);
  while (sequence[sequence.length - 1] !== winnerIndex) {
    sequence.push((sequence[sequence.length - 1] + 1) % candidateCount);
  }
  return sequence;
};

/** Delay (ms) before highlighting step `step` of `total`: starts fast, slows down at the end. */
export const drawStepDelay = (step: number, total: number): number => {
  const progress = total <= 1 ? 1 : step / (total - 1);
  return Math.round(60 + progress * progress * 340);
};
