import { supabase } from '@/shared/lib/supabase';
import { outingAnswersService } from '../services/outingAnswersService';
import { EMPTY_ANSWERS } from '../utils/answersUtils';

jest.mock('@/shared/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as jest.Mock;

interface QueryResult {
  data: unknown;
  error: { message: string; code?: string } | null;
}

interface QueryBuilder extends PromiseLike<QueryResult> {
  select: jest.Mock;
  update: jest.Mock;
  insert: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
}

/** Chainable query builder that resolves to `result` when awaited. */
const builder = (result: QueryResult): QueryBuilder => {
  const chain: QueryBuilder = {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  [chain.select, chain.update, chain.insert, chain.eq, chain.in].forEach((fn) =>
    fn.mockReturnValue(chain),
  );
  return chain;
};

const ROW = {
  id: 'a1', outing_id: 'o1', user_id: 'alice', activity_type: null,
  place_wish: 'Bastille', preferred_time: null, eat_before: null, day_preferences: [],
  period_start: null, period_end: null, budget: null, wishes: [], created_at: '', updated_at: '',
};

describe('outingAnswersService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetchAnswers convertit les lignes', async () => {
    from.mockReturnValue(builder({ data: [ROW], error: null }));
    const answers = await outingAnswersService.fetchAnswers('o1');
    expect(answers).toEqual([expect.objectContaining({ userId: 'alice', placeWish: 'Bastille' })]);
  });

  it('fetchAnswers lève l’erreur Supabase', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'boom' } }));
    await expect(outingAnswersService.fetchAnswers('o1')).rejects.toThrow('boom');
  });

  it('fetchAttendingUserIds renvoie les participants venant ou peut-être', async () => {
    const chain = builder({ data: [{ user_id: 'alice' }, { user_id: 'bob' }], error: null });
    from.mockReturnValue(chain);
    await expect(outingAnswersService.fetchAttendingUserIds('o1')).resolves.toEqual(['alice', 'bob']);
    expect(chain.in).toHaveBeenCalledWith('status', ['accepted', 'maybe']);
  });

  it('saveMyAnswers met à jour la ligne existante sans insérer', async () => {
    const update = builder({ data: [{ id: 'a1' }], error: null });
    from.mockReturnValue(update);
    await outingAnswersService.saveMyAnswers('o1', 'alice', EMPTY_ANSWERS);
    expect(update.update).toHaveBeenCalled();
    expect(update.insert).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('saveMyAnswers insère quand aucune ligne n’existe', async () => {
    const insert = builder({ data: null, error: null });
    from.mockReturnValueOnce(builder({ data: [], error: null })).mockReturnValueOnce(insert);
    await outingAnswersService.saveMyAnswers('o1', 'alice', { ...EMPTY_ANSWERS, eatBefore: true });
    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ outing_id: 'o1', user_id: 'alice', eat_before: true }),
    );
  });

  it('saveMyAnswers retombe sur une mise à jour si une sauvegarde concurrente a inséré la ligne', async () => {
    from
      .mockReturnValueOnce(builder({ data: [], error: null }))
      .mockReturnValueOnce(builder({ data: null, error: { message: 'duplicate', code: '23505' } }))
      .mockReturnValueOnce(builder({ data: [{ id: 'a1' }], error: null }));
    await expect(
      outingAnswersService.saveMyAnswers('o1', 'alice', EMPTY_ANSWERS),
    ).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledTimes(3);
  });

  it('saveMyAnswers lève l’erreur d’insertion', async () => {
    from
      .mockReturnValueOnce(builder({ data: [], error: null }))
      .mockReturnValueOnce(builder({ data: null, error: { message: 'denied', code: '42501' } }));
    await expect(outingAnswersService.saveMyAnswers('o1', 'alice', EMPTY_ANSWERS)).rejects.toThrow('denied');
  });
});
