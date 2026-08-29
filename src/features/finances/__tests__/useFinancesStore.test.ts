import { renderHook, waitFor } from '@testing-library/react-native';
import { useFinancesStore } from '../store/useFinancesStore';
import { useFinances } from '../hooks/useFinances';
import { financesService } from '../services/financesService';
import { Expense, Settlement, CreateExpenseInput, CreateSettlementInput } from '../types';

jest.mock('../services/financesService', () => ({
  financesService: {
    fetchExpenses: jest.fn(),
    fetchExpenseById: jest.fn(),
    fetchSettlements: jest.fn(),
    createExpense: jest.fn(),
    updateExpense: jest.fn(),
    deleteExpense: jest.fn(),
    createSettlement: jest.fn(),
    deleteSettlement: jest.fn(),
  },
}));

describe('useFinancesStore — Unit Test Suite', () => {
  const mockExpense1: Expense = {
    id: 'exp-1',
    sortieId: 'sortie-1',
    title: 'Dîner Burger',
    amountCents: 6000,
    payerId: 'user-1',
    splitType: 'equal',
    category: 'restaurant',
    date: '2026-08-17T19:00:00Z',
    createdBy: 'user-1',
    createdAt: '2026-08-17T19:00:00Z',
    splits: [
      { userId: 'user-1', amountCents: 2000 },
      { userId: 'user-2', amountCents: 2000 },
      { userId: 'user-3', amountCents: 2000 },
    ],
  };

  const mockExpense2: Expense = {
    id: 'exp-2',
    sortieId: 'sortie-1',
    title: 'Bowling',
    amountCents: 3000,
    payerId: 'user-2',
    splitType: 'equal',
    category: 'activite',
    date: '2026-08-17T21:00:00Z',
    createdBy: 'user-2',
    createdAt: '2026-08-17T21:00:00Z',
    splits: [
      { userId: 'user-1', amountCents: 1000 },
      { userId: 'user-2', amountCents: 1000 },
      { userId: 'user-3', amountCents: 1000 },
    ],
  };

  const mockSettlement: Settlement = {
    id: 'set-1',
    sortieId: 'sortie-1',
    payerId: 'user-3',
    recipientId: 'user-1',
    amountCents: 1000,
    date: '2026-08-17T22:00:00Z',
    notes: 'Remboursement partiel',
    createdAt: '2026-08-17T22:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useFinancesStore.getState().reset();
  });

  describe('Initial State & Reset', () => {
    it('doit initialiser le store avec un état vide et propre', () => {
      const state = useFinancesStore.getState();
      expect(state.expenses).toEqual([]);
      expect(state.settlements).toEqual([]);
      expect(state.activeSortieId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('doit réinitialiser l\'état complet lors de l\'appel à reset()', () => {
      useFinancesStore.setState({
        expenses: [mockExpense1],
        settlements: [mockSettlement],
        activeSortieId: 'sortie-1',
        isLoading: true,
        error: 'Une erreur',
      });

      useFinancesStore.getState().reset();

      const state = useFinancesStore.getState();
      expect(state.expenses).toEqual([]);
      expect(state.settlements).toEqual([]);
      expect(state.activeSortieId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('doit effacer l\'erreur avec clearError()', () => {
      useFinancesStore.setState({ error: 'Erreur temporaire' });
      useFinancesStore.getState().clearError();
      expect(useFinancesStore.getState().error).toBeNull();
    });
  });

  describe('setActiveSortieId', () => {
    it('doit mettre à jour l\'identifiant de la sortie active', () => {
      useFinancesStore.getState().setActiveSortieId('sortie-99');
      expect(useFinancesStore.getState().activeSortieId).toBe('sortie-99');

      useFinancesStore.getState().setActiveSortieId(null);
      expect(useFinancesStore.getState().activeSortieId).toBeNull();
    });
  });

  describe('fetchFinances', () => {
    it('doit charger les dépenses et règlements avec succès', async () => {
      (financesService.fetchExpenses as jest.Mock).mockResolvedValue([mockExpense1, mockExpense2]);
      (financesService.fetchSettlements as jest.Mock).mockResolvedValue([mockSettlement]);

      await useFinancesStore.getState().fetchFinances('sortie-1');

      const state = useFinancesStore.getState();
      expect(financesService.fetchExpenses).toHaveBeenCalledWith('sortie-1');
      expect(financesService.fetchSettlements).toHaveBeenCalledWith('sortie-1');
      expect(state.expenses).toEqual([mockExpense1, mockExpense2]);
      expect(state.settlements).toEqual([mockSettlement]);
      expect(state.activeSortieId).toBe('sortie-1');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('doit gérer les erreurs de chargement et mettre à jour le state', async () => {
      (financesService.fetchExpenses as jest.Mock).mockRejectedValue(
        new Error('Échec réseau Supabase')
      );
      (financesService.fetchSettlements as jest.Mock).mockResolvedValue([]);

      await expect(useFinancesStore.getState().fetchFinances('sortie-1')).rejects.toThrow(
        'Échec réseau Supabase'
      );

      const state = useFinancesStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Échec réseau Supabase');
    });

    it('ne fait rien si sortieId est vide', async () => {
      await useFinancesStore.getState().fetchFinances('');
      expect(financesService.fetchExpenses).not.toHaveBeenCalled();
      expect(financesService.fetchSettlements).not.toHaveBeenCalled();
    });
  });

  describe('createExpense', () => {
    it('doit créer une dépense et l\'ajouter au début de la liste', async () => {
      const input: CreateExpenseInput = {
        sortieId: 'sortie-1',
        title: 'Dîner Burger',
        amountCents: 6000,
        payerId: 'user-1',
        splitType: 'equal',
        category: 'restaurant',
        date: '2026-08-17T19:00:00Z',
        createdBy: 'user-1',
        splits: [{ userId: 'user-1', amountCents: 6000 }],
      };

      (financesService.createExpense as jest.Mock).mockResolvedValue(mockExpense1);

      const result = await useFinancesStore.getState().createExpense(input);

      expect(financesService.createExpense).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockExpense1);
      expect(useFinancesStore.getState().expenses).toEqual([mockExpense1]);
      expect(useFinancesStore.getState().isLoading).toBe(false);
      expect(useFinancesStore.getState().error).toBeNull();
    });

    it('doit capturer l\'erreur si la création échoue', async () => {
      (financesService.createExpense as jest.Mock).mockRejectedValue(
        new Error('Montant invalide')
      );

      await expect(
        useFinancesStore.getState().createExpense({} as CreateExpenseInput)
      ).rejects.toThrow('Montant invalide');

      expect(useFinancesStore.getState().isLoading).toBe(false);
      expect(useFinancesStore.getState().error).toBe('Montant invalide');
    });
  });

  describe('updateExpense', () => {
    it('doit mettre à jour la dépense ciblée dans le state', async () => {
      useFinancesStore.setState({ expenses: [mockExpense1, mockExpense2] });

      const updatedExpense: Expense = {
        ...mockExpense1,
        title: 'Dîner Burger Gourmet',
        amountCents: 7500,
      };

      (financesService.updateExpense as jest.Mock).mockResolvedValue(updatedExpense);

      const result = await useFinancesStore
        .getState()
        .updateExpense('exp-1', { title: 'Dîner Burger Gourmet', amountCents: 7500 });

      expect(financesService.updateExpense).toHaveBeenCalledWith('exp-1', {
        title: 'Dîner Burger Gourmet',
        amountCents: 7500,
      });
      expect(result).toEqual(updatedExpense);

      const expenses = useFinancesStore.getState().expenses;
      expect(expenses).toHaveLength(2);
      expect(expenses.find((e) => e.id === 'exp-1')?.title).toBe('Dîner Burger Gourmet');
      expect(expenses.find((e) => e.id === 'exp-2')?.title).toBe('Bowling');
      expect(useFinancesStore.getState().isLoading).toBe(false);
    });

    it('doit capturer l\'erreur si la mise à jour échoue', async () => {
      (financesService.updateExpense as jest.Mock).mockRejectedValue(
        new Error('Dépense introuvable')
      );

      await expect(
        useFinancesStore.getState().updateExpense('exp-99', { title: 'Test' })
      ).rejects.toThrow('Dépense introuvable');

      expect(useFinancesStore.getState().isLoading).toBe(false);
      expect(useFinancesStore.getState().error).toBe('Dépense introuvable');
    });
  });

  describe('deleteExpense', () => {
    it('doit supprimer la dépense du state', async () => {
      useFinancesStore.setState({ expenses: [mockExpense1, mockExpense2] });

      (financesService.deleteExpense as jest.Mock).mockResolvedValue(undefined);

      await useFinancesStore.getState().deleteExpense('exp-1');

      expect(financesService.deleteExpense).toHaveBeenCalledWith('exp-1');
      expect(useFinancesStore.getState().expenses).toEqual([mockExpense2]);
      expect(useFinancesStore.getState().isLoading).toBe(false);
      expect(useFinancesStore.getState().error).toBeNull();
    });

    it('doit capturer l\'erreur si la suppression échoue', async () => {
      (financesService.deleteExpense as jest.Mock).mockRejectedValue(
        new Error('Droits insuffisants')
      );

      await expect(useFinancesStore.getState().deleteExpense('exp-1')).rejects.toThrow(
        'Droits insuffisants'
      );

      expect(useFinancesStore.getState().isLoading).toBe(false);
      expect(useFinancesStore.getState().error).toBe('Droits insuffisants');
    });
  });

  describe('createSettlement & deleteSettlement', () => {
    it('doit créer un remboursement et l\'insérer dans le state', async () => {
      const input: CreateSettlementInput = {
        sortieId: 'sortie-1',
        payerId: 'user-3',
        recipientId: 'user-1',
        amountCents: 1000,
        date: '2026-08-17T22:00:00Z',
      };

      (financesService.createSettlement as jest.Mock).mockResolvedValue(mockSettlement);

      const result = await useFinancesStore.getState().createSettlement(input);

      expect(financesService.createSettlement).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockSettlement);
      expect(useFinancesStore.getState().settlements).toEqual([mockSettlement]);
      expect(useFinancesStore.getState().isLoading).toBe(false);
    });

    it('doit supprimer un remboursement du state', async () => {
      useFinancesStore.setState({ settlements: [mockSettlement] });

      (financesService.deleteSettlement as jest.Mock).mockResolvedValue(undefined);

      await useFinancesStore.getState().deleteSettlement('set-1');

      expect(financesService.deleteSettlement).toHaveBeenCalledWith('set-1');
      expect(useFinancesStore.getState().settlements).toEqual([]);
      expect(useFinancesStore.getState().isLoading).toBe(false);
    });
  });

  describe('Computed Getters / Sélecteurs Métier', () => {
    beforeEach(() => {
      // Setup a realistic multi-user expense scenario:
      // exp1: user-1 pays 60.00€ split equally [u1: 20€, u2: 20€, u3: 20€]
      // exp2: user-2 pays 30.00€ split equally [u1: 10€, u2: 10€, u3: 10€]
      // settlement: user-3 pays 10.00€ to user-1
      // Expected net balances:
      // user-1: paid 60€ + received 10€ refund (owed +10) -> paid: 60, owed: 20+10+10 = 40 => net = +20€ (+2000c)
      // user-2: paid 30, owed 20+10 = 30 => net = 0€ (0c)
      // user-3: paid 10 (refund), owed 20+10 = 30 => net = -20€ (-2000c)
      useFinancesStore.setState({
        expenses: [mockExpense1, mockExpense2],
        settlements: [mockSettlement],
      });
    });

    it('getTotalExpensesCents doit retourner la somme exacte de toutes les dépenses', () => {
      const total = useFinancesStore.getState().getTotalExpensesCents();
      expect(total).toBe(9000); // 6000 + 3000 = 90.00€
    });

    it('getNetBalances doit calculer fidèlement les soldes de chaque participant', () => {
      const balances = useFinancesStore.getState().getNetBalances();

      expect(balances['user-1'].totalPaidCents).toBe(6000);
      expect(balances['user-1'].totalOwedCents).toBe(4000);
      expect(balances['user-1'].netBalanceCents).toBe(2000); // +20.00€

      expect(balances['user-2'].totalPaidCents).toBe(3000);
      expect(balances['user-2'].totalOwedCents).toBe(3000);
      expect(balances['user-2'].netBalanceCents).toBe(0); // 0.00€

      expect(balances['user-3'].totalPaidCents).toBe(1000);
      expect(balances['user-3'].totalOwedCents).toBe(3000);
      expect(balances['user-3'].netBalanceCents).toBe(-2000); // -20.00€

      // Invariant: sum(netBalances) = 0
      const sum =
        balances['user-1'].netBalanceCents +
        balances['user-2'].netBalanceCents +
        balances['user-3'].netBalanceCents;
      expect(sum).toBe(0);
    });

    it('getUserBalanceCents doit retourner le solde précis d\'un utilisateur', () => {
      expect(useFinancesStore.getState().getUserBalanceCents('user-1')).toBe(2000);
      expect(useFinancesStore.getState().getUserBalanceCents('user-2')).toBe(0);
      expect(useFinancesStore.getState().getUserBalanceCents('user-3')).toBe(-2000);
      expect(useFinancesStore.getState().getUserBalanceCents('user-non-existent')).toBe(0);
    });

    it('getSuggestedTransfers doit retourner les virements optimisés minimisant les transactions', () => {
      const transfers = useFinancesStore.getState().getSuggestedTransfers();

      // Only 1 transfer needed: user-3 pays 20.00€ (2000c) to user-1
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toEqual({
        fromUserId: 'user-3',
        toUserId: 'user-1',
        amountCents: 2000,
      });
    });
  });

  describe('useFinances Hook Integration', () => {
    it('doit exposer les données du store et calculer les métriques réactives', () => {
      useFinancesStore.setState({
        expenses: [mockExpense1, mockExpense2],
        settlements: [mockSettlement],
        activeSortieId: 'sortie-1',
      });

      const { result } = renderHook(() => useFinances({ sortieId: 'sortie-1', autoFetch: false }));

      expect(result.current.expenses).toHaveLength(2);
      expect(result.current.settlements).toHaveLength(1);
      expect(result.current.activeSortieId).toBe('sortie-1');
      expect(result.current.totalExpensesCents).toBe(9000);
      expect(result.current.getUserBalance('user-1')).toBe(2000);
      expect(result.current.getUserBalance('user-3')).toBe(-2000);
      expect(result.current.suggestedTransfers).toHaveLength(1);
      expect(result.current.suggestedTransfers[0]).toEqual({
        fromUserId: 'user-3',
        toUserId: 'user-1',
        amountCents: 2000,
      });
    });

    it('doit déclencher automatiquement fetchFinances si autoFetch est activé avec un nouvel id', async () => {
      (financesService.fetchExpenses as jest.Mock).mockResolvedValue([mockExpense1]);
      (financesService.fetchSettlements as jest.Mock).mockResolvedValue([]);

      renderHook(() => useFinances({ sortieId: 'sortie-auto', autoFetch: true }));

      await waitFor(() => {
        expect(financesService.fetchExpenses).toHaveBeenCalledWith('sortie-auto');
        expect(financesService.fetchSettlements).toHaveBeenCalledWith('sortie-auto');
      });
    });
  });
});
