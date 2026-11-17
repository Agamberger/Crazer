import { ActivityVoteEntry, OutingActivity } from '../types/activities';
import { computeActivityResult, nextVote, rankActivities } from '../utils/activityUtils';

const activity = (id: string, overrides: Partial<OutingActivity> = {}): OutingActivity => ({
  id,
  outingId: 'o1',
  title: `Activité ${id}`,
  note: null,
  proposedBy: 'alice',
  place: null,
  createdAt: `2026-11-01T10:0${id.length}:00Z`,
  ...overrides,
});

const vote = (
  activityId: string,
  userId: string,
  value: 'accepted' | 'maybe',
): ActivityVoteEntry => ({ activityId, userId, vote: value });

describe('computeActivityResult', () => {
  it('compte 2 points par « partant » et 1 par « peut-être »', () => {
    const result = computeActivityResult(
      activity('a'),
      [vote('a', 'alice', 'accepted'), vote('a', 'bob', 'maybe'), vote('b', 'bob', 'accepted')],
      'bob',
    );
    expect(result.score).toBe(3);
    expect(result.acceptedUserIds).toEqual(['alice']);
    expect(result.maybeUserIds).toEqual(['bob']);
    expect(result.myVote).toBe('maybe');
  });

  it('sans vote : 0 point et pas de vote perso', () => {
    const result = computeActivityResult(activity('a'), [], 'bob');
    expect(result).toMatchObject({ score: 0, myVote: null });
  });
});

describe('rankActivities', () => {
  it('classe la pool par score puis par ordre de proposition', () => {
    const ranked = rankActivities(
      [activity('a'), activity('bb'), activity('c')],
      [vote('bb', 'alice', 'accepted'), vote('c', 'alice', 'maybe')],
      'alice',
    );
    expect(ranked.map((r) => r.activity.id)).toEqual(['bb', 'c', 'a']);
  });

  it('garde l’ordre de proposition à score égal', () => {
    const ranked = rankActivities([activity('ccc'), activity('a')], [], null);
    expect(ranked.map((r) => r.activity.id)).toEqual(['a', 'ccc']);
  });
});

describe('nextVote', () => {
  it('retire le vote quand on touche à nouveau le même bouton', () => {
    expect(nextVote('accepted', 'accepted')).toBeNull();
  });

  it('change ou pose le vote sinon', () => {
    expect(nextVote('maybe', 'accepted')).toBe('accepted');
    expect(nextVote(null, 'maybe')).toBe('maybe');
  });
});
