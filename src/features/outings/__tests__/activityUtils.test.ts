import { ActivityVoteEntry, OutingActivity } from '../types/activities';
import {
  buildDrawSequence,
  computeActivityGroup,
  computeActivityGroups,
  computeActivityResult,
  drawStepDelay,
  nextVote,
} from '../utils/activityUtils';

const activity = (id: string, day: string | null, overrides: Partial<OutingActivity> = {}): OutingActivity => ({
  id,
  outingId: 'o1',
  day,
  title: `Activité ${id}`,
  note: null,
  proposedBy: 'alice',
  place: null,
  chosen: false,
  createdAt: `2026-11-01T10:0${id.length}:00Z`,
  ...overrides,
});

const vote = (activityId: string, userId: string, value: 'accepted' | 'maybe'): ActivityVoteEntry => ({
  activityId,
  userId,
  vote: value,
});

describe('computeActivityResult', () => {
  it('compte 2 points par « partant » et 1 par « peut-être »', () => {
    const result = computeActivityResult(
      activity('a', '2026-11-10'),
      [vote('a', 'alice', 'accepted'), vote('a', 'bob', 'maybe'), vote('b', 'bob', 'accepted')],
      'bob',
    );
    expect(result.score).toBe(3);
    expect(result.acceptedUserIds).toEqual(['alice']);
    expect(result.maybeUserIds).toEqual(['bob']);
    expect(result.myVote).toBe('maybe');
  });

  it('sans vote : 0 point et pas de vote perso', () => {
    const result = computeActivityResult(activity('a', null), [], 'bob');
    expect(result).toMatchObject({ score: 0, myVote: null });
  });
});

describe('computeActivityGroup', () => {
  const day = '2026-11-10';

  it('est vide sans activité pour ce jour', () => {
    const group = computeActivityGroup(day, [activity('a', '2026-11-11')], [], 'alice');
    expect(group.state).toBe('empty');
  });

  it('classe par score puis par ordre de proposition', () => {
    const group = computeActivityGroup(
      day,
      [activity('a', day), activity('bb', day), activity('c', day)],
      [vote('bb', 'alice', 'accepted'), vote('c', 'alice', 'maybe')],
      'alice',
    );
    expect(group.results.map((r) => r.activity.id)).toEqual(['bb', 'c', 'a']);
    expect(group.state).toBe('voting');
    expect(group.tiedResults).toEqual([]);
  });

  it('détecte une égalité sur le meilleur score positif', () => {
    const group = computeActivityGroup(
      day,
      [activity('a', day), activity('bb', day), activity('c', day)],
      [vote('a', 'alice', 'accepted'), vote('bb', 'bob', 'accepted'), vote('c', 'bob', 'maybe')],
      'alice',
    );
    expect(group.state).toBe('tie');
    expect(group.tiedResults.map((r) => r.activity.id).sort()).toEqual(['a', 'bb']);
  });

  it('n’y a pas d’égalité tant que personne n’a voté', () => {
    const group = computeActivityGroup(day, [activity('a', day), activity('bb', day)], [], 'alice');
    expect(group.state).toBe('voting');
  });

  it('est décidée dès qu’une activité est retenue, même à égalité', () => {
    const group = computeActivityGroup(
      day,
      [activity('a', day, { chosen: true }), activity('bb', day)],
      [vote('a', 'alice', 'accepted'), vote('bb', 'bob', 'accepted')],
      'alice',
    );
    expect(group.state).toBe('decided');
    expect(group.chosenResult?.activity.id).toBe('a');
    expect(group.tiedResults).toEqual([]);
  });
});

describe('computeActivityGroups', () => {
  it('crée un groupe par jour candidat, trié', () => {
    const groups = computeActivityGroups(['2026-11-12', '2026-11-10'], [], [], null);
    expect(groups.map((g) => g.day)).toEqual(['2026-11-10', '2026-11-12']);
  });

  it('ajoute le groupe « peu importe » en tête seulement s’il contient des activités', () => {
    const withGeneral = computeActivityGroups(['2026-11-10'], [activity('a', null)], [], null);
    expect(withGeneral.map((g) => g.day)).toEqual([null, '2026-11-10']);
    const without = computeActivityGroups(['2026-11-10'], [activity('a', '2026-11-10')], [], null);
    expect(without.map((g) => g.day)).toEqual(['2026-11-10']);
  });
});

describe('nextVote', () => {
  it('retire le vote quand on touche à nouveau le même bouton', () => {
    expect(nextVote('accepted', 'accepted')).toBeNull();
  });
  it('change ou pose le vote sinon', () => {
    expect(nextVote('accepted', 'maybe')).toBe('maybe');
    expect(nextVote(null, 'accepted')).toBe('accepted');
  });
});

describe('buildDrawSequence', () => {
  it.each([
    [2, 0],
    [2, 1],
    [3, 2],
    [4, 1],
  ])('boucle sur %i candidats et s’arrête sur le gagnant %i', (count, winner) => {
    const sequence = buildDrawSequence(count, winner, 3);
    expect(sequence[sequence.length - 1]).toBe(winner);
    expect(sequence.length).toBeGreaterThanOrEqual(count * 3);
    expect(sequence.every((i) => i >= 0 && i < count)).toBe(true);
  });

  it('renvoie une séquence vide sans candidat', () => {
    expect(buildDrawSequence(0, 0, 3)).toEqual([]);
  });
});

describe('drawStepDelay', () => {
  it('ralentit au fil du tirage', () => {
    expect(drawStepDelay(0, 10)).toBeLessThan(drawStepDelay(9, 10));
    expect(drawStepDelay(0, 1)).toBeGreaterThan(0);
  });
});
