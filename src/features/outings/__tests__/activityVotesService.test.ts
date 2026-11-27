import { supabase } from '@/shared/lib/supabase';
import { activityVotesService } from '../services/activityVotesService';

jest.mock('@/shared/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn(), channel: jest.fn(), removeChannel: jest.fn() },
}));

const from = supabase.from as jest.Mock;
const rpc = supabase.rpc as jest.Mock;

interface QueryResult {
  data: unknown;
  error: { message: string; code?: string } | null;
}

interface QueryBuilder extends PromiseLike<QueryResult> {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  single: jest.Mock;
}

const builder = (result: QueryResult): QueryBuilder => {
  const chain: QueryBuilder = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    single: jest.fn(),
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  [
    chain.select,
    chain.insert,
    chain.update,
    chain.delete,
    chain.eq,
    chain.order,
    chain.single,
  ].forEach((fn) => fn.mockReturnValue(chain));
  return chain;
};

const ACTIVITY_ROW = {
  id: 'a1',
  outing_id: 'o1',
  title: 'Bowling',
  note: null,
  proposed_by: 'alice',
  place_id: null,
  places: null,
  created_at: 't',
  updated_at: 't',
};

describe('activityVotesService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetchActivities convertit les lignes', async () => {
    from.mockReturnValue(builder({ data: [ACTIVITY_ROW], error: null }));
    await expect(activityVotesService.fetchActivities('o1')).resolves.toEqual([
      {
        id: 'a1',
        outingId: 'o1',
        title: 'Bowling',
        note: null,
        proposedBy: 'alice',
        place: null,
        createdAt: 't',
      },
    ]);
  });

  it('fetchActivities garde le seul place ID d’un lieu Google', async () => {
    from.mockReturnValue(
      builder({
        data: [
          {
            ...ACTIVITY_ROW,
            place_id: 'p-google',
            places: {
              id: 'p-google',
              name: null,
              address: null,
              source: 'google',
              source_id: 'ChIJ1',
            },
          },
          {
            ...ACTIVITY_ROW,
            id: 'a2',
            place_id: 'p-crazer',
            places: {
              id: 'p-crazer',
              name: 'Strike',
              address: '1 rue X',
              source: 'custom',
              source_id: 'x',
            },
          },
        ],
        error: null,
      }),
    );

    const activities = await activityVotesService.fetchActivities('o1');

    expect(activities.map((activity) => activity.place)).toEqual([
      { id: 'p-google', name: null, address: null, googlePlaceId: 'ChIJ1' },
      { id: 'p-crazer', name: 'Strike', address: '1 rue X', googlePlaceId: null },
    ]);
  });

  it('fetchVotes convertit les lignes et remonte les erreurs', async () => {
    from.mockReturnValueOnce(
      builder({ data: [{ activity_id: 'a1', user_id: 'bob', vote: 'maybe' }], error: null }),
    );
    await expect(activityVotesService.fetchVotes('o1')).resolves.toEqual([
      { activityId: 'a1', userId: 'bob', vote: 'maybe' },
    ]);
    from.mockReturnValueOnce(builder({ data: null, error: { message: 'boom' } }));
    await expect(activityVotesService.fetchVotes('o1')).rejects.toThrow('boom');
  });

  it('proposeActivity nettoie le titre et la note', async () => {
    const chain = builder({ data: ACTIVITY_ROW, error: null });
    from.mockReturnValue(chain);
    await activityVotesService.proposeActivity({
      outingId: 'o1',
      userId: 'alice',
      title: '  Bowling ',
      note: '  ',
      placeId: 'p1',
    });
    expect(chain.insert).toHaveBeenCalledWith({
      outing_id: 'o1',
      proposed_by: 'alice',
      title: 'Bowling',
      note: null,
      place_id: 'p1',
    });
  });

  it('castVote met à jour le vote existant sans insérer', async () => {
    const update = builder({ data: [{ id: 'v1' }], error: null });
    from.mockReturnValue(update);
    await activityVotesService.castVote('o1', 'a1', 'bob', 'accepted');
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ vote: 'accepted' }));
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('castVote insère quand aucun vote n’existe', async () => {
    const update = builder({ data: [], error: null });
    const insert = builder({ data: null, error: null });
    from.mockReturnValueOnce(update).mockReturnValueOnce(insert);
    await activityVotesService.castVote('o1', 'a1', 'bob', 'maybe');
    expect(insert.insert).toHaveBeenCalledWith({
      outing_id: 'o1',
      activity_id: 'a1',
      user_id: 'bob',
      vote: 'maybe',
    });
  });

  it('castVote retente la mise à jour après un conflit d’unicité', async () => {
    from
      .mockReturnValueOnce(builder({ data: [], error: null }))
      .mockReturnValueOnce(builder({ data: null, error: { message: 'dup', code: '23505' } }))
      .mockReturnValueOnce(builder({ data: [{ id: 'v1' }], error: null }));
    await expect(
      activityVotesService.castVote('o1', 'a1', 'bob', 'maybe'),
    ).resolves.toBeUndefined();
  });

  it('castVote échoue si l’insertion est refusée', async () => {
    from
      .mockReturnValueOnce(builder({ data: [], error: null }))
      .mockReturnValueOnce(builder({ data: null, error: { message: 'denied', code: '42501' } }));
    await expect(activityVotesService.castVote('o1', 'a1', 'bob', 'maybe')).rejects.toThrow(
      'denied',
    );
  });

  it('removeVote supprime le vote de l’utilisateur', async () => {
    const chain = builder({ data: null, error: null });
    from.mockReturnValue(chain);
    await activityVotesService.removeVote('a1', 'bob');
    expect(chain.eq).toHaveBeenCalledWith('activity_id', 'a1');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'bob');
  });

  it('place une activité de la pool dans le programme', async () => {
    rpc.mockResolvedValue({ data: 'step-1', error: null });
    await expect(
      activityVotesService.placeActivity('a1', '2026-11-20T17:00:00.000Z', 60),
    ).resolves.toBe('step-1');
    expect(rpc).toHaveBeenCalledWith('place_outing_activity', {
      p_activity_id: 'a1',
      p_scheduled_for: '2026-11-20T17:00:00.000Z',
      p_duration_min: 60,
    });
  });

  it('remonte l’erreur d’une RPC', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'activity already placed' } });
    await expect(activityVotesService.placeActivity('a1', 't', 60)).rejects.toThrow(
      'activity already placed',
    );
  });

  it('subscribeToActivities écoute les deux tables et se désabonne', () => {
    const channel = { on: jest.fn(), subscribe: jest.fn() };
    channel.on.mockReturnValue(channel);
    channel.subscribe.mockReturnValue(channel);
    (supabase.channel as jest.Mock).mockReturnValue(channel);
    const onChange = jest.fn();
    const unsubscribe = activityVotesService.subscribeToActivities('o1', onChange);
    const tables = channel.on.mock.calls.map(([, config]) => config.table);
    expect(tables).toEqual(['outing_activities', 'outing_activity_votes']);
    unsubscribe();
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });
});
