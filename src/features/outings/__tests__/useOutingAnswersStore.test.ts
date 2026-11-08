import { outingAnswersService } from '../services/outingAnswersService';
import { useOutingAnswersStore } from '../store/useOutingAnswersStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { MemberAnswers } from '../types/questions';
import { EMPTY_ANSWERS } from '../utils/answersUtils';
import { OutingRow } from '@/shared/types';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));
jest.mock('../services/outingAnswersService', () => ({
  outingAnswersService: {
    fetchAnswers: jest.fn(),
    saveMyAnswers: jest.fn(),
  },
}));

const service = outingAnswersService as jest.Mocked<typeof outingAnswersService>;
const OUTING = { id: 'o1', title: 'Glouglou', outing_type: null } as OutingRow;

describe('useOutingAnswersStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOutingAnswersStore.setState({ answersByOutingId: {}, error: null });
    useOutingsStore.setState({ outings: [OUTING] });
  });

  it('charge les réponses de la sortie', async () => {
    const alice: MemberAnswers = { ...EMPTY_ANSWERS, userId: 'alice', eatBefore: true };
    service.fetchAnswers.mockResolvedValue([alice]);
    await expect(useOutingAnswersStore.getState().fetchAnswers('o1')).resolves.toEqual([alice]);
    expect(useOutingAnswersStore.getState().answersByOutingId.o1).toEqual([alice]);
  });

  it('garde l’erreur et renvoie null si le chargement échoue', async () => {
    service.fetchAnswers.mockRejectedValue(new Error('boom'));
    await expect(useOutingAnswersStore.getState().fetchAnswers('o1')).resolves.toBeNull();
    expect(useOutingAnswersStore.getState().error).toBe('boom');
  });

  it('remplace les réponses de l’utilisateur après enregistrement', async () => {
    useOutingAnswersStore.setState({
      answersByOutingId: { o1: [{ ...EMPTY_ANSWERS, userId: 'alice' }, { ...EMPTY_ANSWERS, userId: 'bob' }] },
    });
    service.saveMyAnswers.mockResolvedValue();
    await useOutingAnswersStore.getState().saveMyAnswers('o1', 'alice', { ...EMPTY_ANSWERS, eatBefore: true });
    const stored = useOutingAnswersStore.getState().answersByOutingId.o1;
    expect(stored).toHaveLength(2);
    expect(stored.find((a) => a.userId === 'alice')?.eatBefore).toBe(true);
  });

  it('relance l’erreur si l’enregistrement échoue', async () => {
    service.saveMyAnswers.mockRejectedValue(new Error('denied'));
    await expect(
      useOutingAnswersStore.getState().saveMyAnswers('o1', 'alice', EMPTY_ANSWERS),
    ).rejects.toThrow('denied');
    expect(useOutingAnswersStore.getState()).toMatchObject({ error: 'denied', isSaving: false });
  });

  it('passe par l’action updateOuting du store des sorties pour changer le type', async () => {
    const updateOuting = jest.fn().mockResolvedValue({ ...OUTING, outing_type: 'one_day' });
    useOutingsStore.setState({ updateOuting });
    await useOutingAnswersStore.getState().setOutingType('o1', 'one_day');
    expect(updateOuting).toHaveBeenCalledWith('o1', { outing_type: 'one_day' });
    expect(useOutingAnswersStore.getState().isSaving).toBe(false);
  });

  it('relaie l’erreur d’origine si le type ne peut pas être choisi', async () => {
    useOutingsStore.setState({ updateOuting: jest.fn().mockResolvedValue(null), error: 'new row violates RLS' });
    await expect(useOutingAnswersStore.getState().setOutingType('o1', 'precise')).rejects.toThrow(
      'new row violates RLS',
    );
    expect(useOutingAnswersStore.getState().isSaving).toBe(false);
  });
});
