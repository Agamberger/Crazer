import { financesService } from '../services/financesService';
import { supabase } from '@/shared/lib/supabase';
import { CreateExpenseInput, CreateSettlementInput } from '../types';

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('financesService — Unit Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchExpenses', () => {
    it('doit récupérer et mapper correctement les dépenses avec leurs payeurs et répartitions', async () => {
      const mockRawExpenses = [
        {
          id: 'exp-1',
          sortie_id: 'sortie-123',
          title: 'Restaurant Italien',
          amount_cents: 6000,
          payer_id: 'user-1',
          split_type: 'equal',
          category: 'restaurant',
          date: '2026-08-17T19:00:00Z',
          created_by: 'user-1',
          created_at: '2026-08-17T19:05:00Z',
          updated_at: '2026-08-17T19:05:00Z',
          expense_payers: [
            {
              id: 'p-1',
              expense_id: 'exp-1',
              user_id: 'user-1',
              amount_cents: 4000,
              created_at: '2026-08-17T19:05:00Z',
            },
            {
              id: 'p-2',
              expense_id: 'exp-1',
              user_id: 'user-2',
              amount_cents: 2000,
              created_at: '2026-08-17T19:05:00Z',
            },
          ],
          expense_splits: [
            {
              id: 's-1',
              expense_id: 'exp-1',
              user_id: 'user-1',
              amount_cents: 3000,
              percentage: 50,
              shares: null,
              created_at: '2026-08-17T19:05:00Z',
            },
            {
              id: 's-2',
              expense_id: 'exp-1',
              user_id: 'user-2',
              amount_cents: 3000,
              percentage: 50,
              shares: 1,
              created_at: '2026-08-17T19:05:00Z',
            },
          ],
        },
      ];

      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockRawExpenses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const expenses = await financesService.fetchExpenses('sortie-123');

      expect(supabase.from).toHaveBeenCalledWith('expenses');
      expect(chain.eq).toHaveBeenCalledWith('sortie_id', 'sortie-123');
      expect(chain.order).toHaveBeenCalledWith('date', { ascending: false });

      expect(expenses).toHaveLength(1);
      const exp = expenses[0];
      expect(exp.id).toBe('exp-1');
      expect(exp.sortieId).toBe('sortie-123');
      expect(exp.title).toBe('Restaurant Italien');
      expect(exp.amountCents).toBe(6000);
      expect(exp.payerId).toBe('user-1');
      expect(exp.splitType).toBe('equal');
      expect(exp.category).toBe('restaurant');
      expect(exp.date).toBe('2026-08-17T19:00:00Z');
      expect(exp.createdBy).toBe('user-1');
      expect(exp.createdAt).toBe('2026-08-17T19:05:00Z');

      expect(exp.payers).toEqual([
        { userId: 'user-1', amountCents: 4000 },
        { userId: 'user-2', amountCents: 2000 },
      ]);

      expect(exp.splits).toEqual([
        { userId: 'user-1', amountCents: 3000, percentage: 50 },
        { userId: 'user-2', amountCents: 3000, percentage: 50, shares: 1 },
      ]);
    });

    it('doit lever une erreur si sortieId est vide', async () => {
      await expect(financesService.fetchExpenses('')).rejects.toThrow(
        'fetchExpenses: sortieId est requis'
      );
    });

    it('doit lever une erreur descriptive si Supabase échoue', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'Database connection lost' } }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await expect(financesService.fetchExpenses('sortie-123')).rejects.toThrow(
        'Erreur lors de la récupération des dépenses : Database connection lost'
      );
    });
  });

  describe('fetchExpenseById', () => {
    it('doit récupérer et hydrater une dépense par son id', async () => {
      const mockRawExpense = {
        id: 'exp-single',
        sortie_id: 'sortie-1',
        title: 'Taxi',
        amount_cents: 2500,
        payer_id: 'user-1',
        split_type: 'equal',
        category: 'transport',
        date: '2026-08-17T20:00:00Z',
        created_by: 'user-1',
        created_at: '2026-08-17T20:00:00Z',
        updated_at: '2026-08-17T20:00:00Z',
        expense_payers: [],
        expense_splits: [
          {
            id: 's-1',
            expense_id: 'exp-single',
            user_id: 'user-1',
            amount_cents: 1250,
            percentage: null,
            shares: null,
            created_at: '2026-08-17T20:00:00Z',
          },
          {
            id: 's-2',
            expense_id: 'exp-single',
            user_id: 'user-2',
            amount_cents: 1250,
            percentage: null,
            shares: null,
            created_at: '2026-08-17T20:00:00Z',
          },
        ],
      };

      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockRawExpense, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const exp = await financesService.fetchExpenseById('exp-single');

      expect(supabase.from).toHaveBeenCalledWith('expenses');
      expect(chain.eq).toHaveBeenCalledWith('id', 'exp-single');
      expect(exp.id).toBe('exp-single');
      expect(exp.amountCents).toBe(2500);
      expect(exp.payers).toBeUndefined();
      expect(exp.splits).toHaveLength(2);
    });

    it('doit lever une erreur si id est vide ou introuvable', async () => {
      await expect(financesService.fetchExpenseById('')).rejects.toThrow(
        'fetchExpenseById: id est requis'
      );

      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Row not found' } }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await expect(financesService.fetchExpenseById('exp-unknown')).rejects.toThrow(
        'Dépense introuvable (exp-unknown) : Row not found'
      );
    });
  });

  describe('fetchSettlements', () => {
    it('doit récupérer et mapper correctement les règlements directs', async () => {
      const mockRawSettlements = [
        {
          id: 'set-1',
          sortie_id: 'sortie-123',
          payer_id: 'user-2',
          recipient_id: 'user-1',
          amount_cents: 1500,
          date: '2026-08-17T21:00:00Z',
          notes: 'Remboursement resto',
          created_at: '2026-08-17T21:01:00Z',
          updated_at: '2026-08-17T21:01:00Z',
        },
      ];

      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockRawSettlements, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const settlements = await financesService.fetchSettlements('sortie-123');

      expect(supabase.from).toHaveBeenCalledWith('settlements');
      expect(chain.eq).toHaveBeenCalledWith('sortie_id', 'sortie-123');
      expect(settlements).toEqual([
        {
          id: 'set-1',
          sortieId: 'sortie-123',
          payerId: 'user-2',
          recipientId: 'user-1',
          amountCents: 1500,
          date: '2026-08-17T21:00:00Z',
          notes: 'Remboursement resto',
          createdAt: '2026-08-17T21:01:00Z',
        },
      ]);
    });

    it('doit lever une erreur si sortieId est manquant', async () => {
      await expect(financesService.fetchSettlements('')).rejects.toThrow(
        'fetchSettlements: sortieId est requis'
      );
    });

    it('doit lever une erreur si Supabase échoue', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Permission denied' } }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await expect(financesService.fetchSettlements('sortie-123')).rejects.toThrow(
        'Erreur lors de la récupération des remboursements : Permission denied'
      );
    });
  });

  describe('createExpense', () => {
    const validExpenseInput: CreateExpenseInput = {
      sortieId: 'sortie-123',
      title: 'Location Airbnb',
      amountCents: 12000,
      payerId: 'user-1',
      payers: [
        { userId: 'user-1', amountCents: 8000 },
        { userId: 'user-2', amountCents: 4000 },
      ],
      splitType: 'shares',
      category: 'logement',
      date: '2026-08-17T18:00:00Z',
      createdBy: 'user-1',
      splits: [
        { userId: 'user-1', amountCents: 6000, shares: 1 },
        { userId: 'user-2', amountCents: 6000, shares: 1 },
      ],
    };

    it('doit insérer avec succès la dépense, ses payeurs et ses répartitions', async () => {
      const createdRow = {
        id: 'exp-created-1',
        sortie_id: 'sortie-123',
        title: 'Location Airbnb',
        amount_cents: 12000,
        payer_id: 'user-1',
        split_type: 'shares',
        category: 'logement',
        date: '2026-08-17T18:00:00Z',
        created_by: 'user-1',
        created_at: '2026-08-17T18:05:00Z',
        updated_at: '2026-08-17T18:05:00Z',
      };

      const expensesChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: createdRow, error: null }),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const payersChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      const splitsChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'expenses') return expensesChain;
        if (table === 'expense_payers') return payersChain;
        if (table === 'expense_splits') return splitsChain;
        return {};
      });

      const result = await financesService.createExpense(validExpenseInput);

      expect(supabase.from).toHaveBeenCalledWith('expenses');
      expect(expensesChain.insert).toHaveBeenCalledWith({
        sortie_id: 'sortie-123',
        title: 'Location Airbnb',
        amount_cents: 12000,
        payer_id: 'user-1',
        split_type: 'shares',
        category: 'logement',
        date: '2026-08-17T18:00:00Z',
        created_by: 'user-1',
      });

      expect(supabase.from).toHaveBeenCalledWith('expense_payers');
      expect(payersChain.insert).toHaveBeenCalledWith([
        { expense_id: 'exp-created-1', user_id: 'user-1', amount_cents: 8000 },
        { expense_id: 'exp-created-1', user_id: 'user-2', amount_cents: 4000 },
      ]);

      expect(supabase.from).toHaveBeenCalledWith('expense_splits');
      expect(splitsChain.insert).toHaveBeenCalledWith([
        {
          expense_id: 'exp-created-1',
          user_id: 'user-1',
          amount_cents: 6000,
          percentage: null,
          shares: 1,
        },
        {
          expense_id: 'exp-created-1',
          user_id: 'user-2',
          amount_cents: 6000,
          percentage: null,
          shares: 1,
        },
      ]);

      expect(result.id).toBe('exp-created-1');
      expect(result.title).toBe('Location Airbnb');
      expect(result.payers).toHaveLength(2);
      expect(result.splits).toHaveLength(2);
    });

    it('doit valider les données obligatoires (sortieId, title, amountCents, payerId)', async () => {
      await expect(
        financesService.createExpense({ ...validExpenseInput, sortieId: '' })
      ).rejects.toThrow('createExpense: sortieId est requis');

      await expect(
        financesService.createExpense({ ...validExpenseInput, title: '  ' })
      ).rejects.toThrow('createExpense: title est requis');

      await expect(
        financesService.createExpense({ ...validExpenseInput, amountCents: 0 })
      ).rejects.toThrow('createExpense: amountCents doit être strictement positif');

      await expect(
        financesService.createExpense({ ...validExpenseInput, payerId: '' })
      ).rejects.toThrow('createExpense: payerId est requis');
    });

    it('doit rollback/nettoyer la dépense créée si l insertion des splits échoue', async () => {
      const createdRow = {
        id: 'exp-created-fail',
        sortie_id: 'sortie-123',
        title: 'Location Airbnb',
        amount_cents: 12000,
        payer_id: 'user-1',
        split_type: 'shares',
        category: 'logement',
        date: '2026-08-17T18:00:00Z',
        created_by: 'user-1',
        created_at: '2026-08-17T18:05:00Z',
      };

      const expensesDeleteChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const expensesChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: createdRow, error: null }),
        delete: jest.fn().mockReturnValue(expensesDeleteChain),
      };

      const splitsChain = {
        insert: jest.fn().mockResolvedValue({ error: { message: 'Invalid split percentage' } }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'expenses') return expensesChain;
        if (table === 'expense_splits') return splitsChain;
        return {};
      });

      await expect(
        financesService.createExpense({
          ...validExpenseInput,
          payers: undefined,
        })
      ).rejects.toThrow('Échec de l\'enregistrement des répartitions : Invalid split percentage');

      expect(expensesChain.delete).toHaveBeenCalled();
      expect(expensesDeleteChain.eq).toHaveBeenCalledWith('id', 'exp-created-fail');
    });
  });

  describe('updateExpense', () => {
    it('doit mettre à jour la dépense et rafraîchir les sous-tables', async () => {
      const expensesUpdateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const payersDeleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      const splitsDeleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      const reloadedExpense = {
        id: 'exp-1',
        sortie_id: 'sortie-123',
        title: 'Nouveau titre',
        amount_cents: 5000,
        payer_id: 'user-2',
        split_type: 'equal',
        category: 'bar',
        date: '2026-08-17T20:00:00Z',
        created_by: 'user-1',
        created_at: '2026-08-17T19:00:00Z',
        updated_at: '2026-08-17T20:05:00Z',
        expense_payers: [],
        expense_splits: [
          {
            id: 's-new',
            expense_id: 'exp-1',
            user_id: 'user-2',
            amount_cents: 5000,
            percentage: null,
            shares: null,
            created_at: '2026-08-17T20:05:00Z',
          },
        ],
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: reloadedExpense, error: null }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'expenses') {
          return {
            ...expensesUpdateChain,
            ...selectChain,
          };
        }
        if (table === 'expense_payers') return payersDeleteChain;
        if (table === 'expense_splits') return splitsDeleteChain;
        return {};
      });

      const updated = await financesService.updateExpense('exp-1', {
        title: 'Nouveau titre',
        amountCents: 5000,
        splits: [{ userId: 'user-2', amountCents: 5000 }],
      });

      expect(updated.title).toBe('Nouveau titre');
      expect(updated.amountCents).toBe(5000);
      expect(updated.splits).toHaveLength(1);
    });

    it('doit lever une erreur si id est manquant', async () => {
      await expect(financesService.updateExpense('', { title: 'Test' })).rejects.toThrow(
        'updateExpense: id est requis'
      );
    });
  });

  describe('deleteExpense', () => {
    it('doit supprimer la dépense de la table expenses', async () => {
      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await financesService.deleteExpense('exp-1');

      expect(supabase.from).toHaveBeenCalledWith('expenses');
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', 'exp-1');
    });

    it('doit lever une erreur si la suppression échoue', async () => {
      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'Foreign key constraint' } }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await expect(financesService.deleteExpense('exp-1')).rejects.toThrow(
        'Échec de la suppression de la dépense exp-1 : Foreign key constraint'
      );
    });
  });

  describe('createSettlement', () => {
    const validSettlementInput: CreateSettlementInput = {
      sortieId: 'sortie-123',
      payerId: 'user-2',
      recipientId: 'user-1',
      amountCents: 2000,
      date: '2026-08-17T21:00:00Z',
      notes: 'Remboursement bières',
    };

    it('doit insérer avec succès un remboursement', async () => {
      const mockCreatedSettlementRow = {
        id: 'set-new-1',
        sortie_id: 'sortie-123',
        payer_id: 'user-2',
        recipient_id: 'user-1',
        amount_cents: 2000,
        date: '2026-08-17T21:00:00Z',
        notes: 'Remboursement bières',
        created_at: '2026-08-17T21:01:00Z',
        updated_at: '2026-08-17T21:01:00Z',
      };

      const chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedSettlementRow, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const settlement = await financesService.createSettlement(validSettlementInput);

      expect(supabase.from).toHaveBeenCalledWith('settlements');
      expect(chain.insert).toHaveBeenCalledWith({
        sortie_id: 'sortie-123',
        payer_id: 'user-2',
        recipient_id: 'user-1',
        amount_cents: 2000,
        date: '2026-08-17T21:00:00Z',
        notes: 'Remboursement bières',
      });
      expect(settlement.id).toBe('set-new-1');
      expect(settlement.amountCents).toBe(2000);
      expect(settlement.notes).toBe('Remboursement bières');
    });

    it('doit valider que le payeur et le bénéficiaire ne sont pas identiques', async () => {
      await expect(
        financesService.createSettlement({
          ...validSettlementInput,
          payerId: 'user-1',
          recipientId: 'user-1',
        })
      ).rejects.toThrow(
        'createSettlement: le payeur et le bénéficiaire ne peuvent pas être identiques'
      );
    });

    it('doit valider que le montant est strictement positif', async () => {
      await expect(
        financesService.createSettlement({
          ...validSettlementInput,
          amountCents: 0,
        })
      ).rejects.toThrow('createSettlement: amountCents doit être strictement positif');
    });
  });

  describe('deleteSettlement', () => {
    it('doit supprimer le remboursement de la table settlements', async () => {
      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await financesService.deleteSettlement('set-1');

      expect(supabase.from).toHaveBeenCalledWith('settlements');
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', 'set-1');
    });

    it('doit lever une erreur si la suppression échoue', async () => {
      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'Record not found' } }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await expect(financesService.deleteSettlement('set-1')).rejects.toThrow(
        'Échec de la suppression du remboursement set-1 : Record not found'
      );
    });
  });
});
