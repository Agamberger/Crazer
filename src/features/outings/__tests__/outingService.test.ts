import { outingService } from '../services/outingService';
import { supabase } from '@/shared/lib/supabase';
import { OutingInsert, OutingRow } from '@/shared/types';

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
});
