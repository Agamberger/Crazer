import { outingService } from '../services/outingService';
import { supabase } from '@/shared/lib/supabase';
import { OutingInsert, OutingRow, OutingUpdate } from '@/shared/types';

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('outingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchMyOutings', () => {
    it('fetches outings sorted by start_date DESC', async () => {
      const mockOutings: Partial<OutingRow>[] = [
        {
          id: 'out-1',
          title: 'Soirée Bowling',
          start_date: '2026-08-25T20:00:00Z',
          created_by: 'user-123',
          status: 'planned',
          description: 'Bowling entre amis',
          cover_image: null,
          created_at: '2026-08-24T20:00:00Z',
          updated_at: '2026-08-24T20:00:00Z',
        },
      ];

      const selectMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({ data: mockOutings, error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock,
        order: orderMock,
      });

      const result = await outingService.fetchMyOutings();

      expect(supabase.from).toHaveBeenCalledWith('outings');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(orderMock).toHaveBeenCalledWith('start_date', { ascending: false });
      expect(result).toEqual(mockOutings);
    });

    it('throws error when Supabase query fails', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const orderMock = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB Connection Error' } });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock,
        order: orderMock,
      });

      await expect(outingService.fetchMyOutings()).rejects.toThrow('DB Connection Error');
    });
  });

  describe('getOutingById', () => {
    it('fetches a single outing by id', async () => {
      const mockOuting: OutingRow = {
        id: 'out-123',
        title: 'Sortie Laser Game',
        description: 'Session intense',
        start_date: '2026-08-27T18:00:00Z',
        created_by: 'user-123',
        status: 'planned',
        cover_image: null,
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T20:00:00Z',
      };

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: mockOuting, error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      const result = await outingService.getOutingById('out-123');

      expect(supabase.from).toHaveBeenCalledWith('outings');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('id', 'out-123');
      expect(singleMock).toHaveBeenCalled();
      expect(result).toEqual(mockOuting);
    });

    it('throws error when fetching single outing fails', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Sortie non trouvée' } });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      await expect(outingService.getOutingById('invalid-id')).rejects.toThrow('Sortie non trouvée');
    });
  });

  describe('createOuting', () => {
    it('inserts a new outing and returns the created row', async () => {
      const newOuting: OutingInsert = {
        title: 'Nouvelle sortie',
        description: 'Sortie créée par défaut',
        start_date: '2026-08-26T18:00:00Z',
        created_by: 'user-123',
        status: 'draft',
      };

      const createdRow: OutingRow = {
        id: 'out-999',
        ...newOuting,
        description: newOuting.description || null,
        status: 'draft',
        cover_image: null,
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T20:00:00Z',
      };

      const insertMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: createdRow, error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const result = await outingService.createOuting(newOuting);

      expect(supabase.from).toHaveBeenCalledWith('outings');
      expect(insertMock).toHaveBeenCalledWith(newOuting);
      expect(singleMock).toHaveBeenCalled();
      expect(result).toEqual(createdRow);
    });

    it('throws error when creation fails', async () => {
      const newOuting: OutingInsert = {
        title: 'Nouvelle sortie',
        start_date: '2026-08-26T18:00:00Z',
        created_by: 'user-123',
      };

      const insertMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Insert constraint error' } });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      await expect(outingService.createOuting(newOuting)).rejects.toThrow(
        'Insert constraint error'
      );
    });
  });

  describe('updateOuting', () => {
    it('updates an outing and returns the updated row', async () => {
      const updates: OutingUpdate = {
        title: 'Titre Modifié',
        description: 'Nouvelle description',
        status: 'planned',
      };

      const updatedRow: OutingRow = {
        id: 'out-123',
        title: 'Titre Modifié',
        description: 'Nouvelle description',
        start_date: '2026-08-25T20:00:00Z',
        created_by: 'user-123',
        status: 'planned',
        cover_image: null,
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T21:00:00Z',
      };

      const updateMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: updatedRow, error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
        single: singleMock,
      });

      const result = await outingService.updateOuting('out-123', updates);

      expect(supabase.from).toHaveBeenCalledWith('outings');
      expect(updateMock).toHaveBeenCalledWith(updates);
      expect(eqMock).toHaveBeenCalledWith('id', 'out-123');
      expect(selectMock).toHaveBeenCalled();
      expect(singleMock).toHaveBeenCalled();
      expect(result).toEqual(updatedRow);
    });

    it('throws error when update query fails', async () => {
      const updateMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Update error' } });

      (supabase.from as jest.Mock).mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
        single: singleMock,
      });

      await expect(outingService.updateOuting('out-123', { title: 'Test' })).rejects.toThrow(
        'Update error'
      );
    });
  });
});
