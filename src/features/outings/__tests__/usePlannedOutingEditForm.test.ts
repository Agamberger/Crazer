import { act, renderHook } from '@testing-library/react-native';
import { PlannedOutingRow } from '@/shared/types';
import {
  usePlannedOutingEditForm,
  UsePlannedOutingEditFormOptions,
} from '../hooks/usePlannedOutingEditForm';

const plannedOuting: PlannedOutingRow = {
  activity_id: null,
  id: 'po-1',
  outing_id: 'out-1',
  place_id: null,
  title: 'Bowling',
  description: null,
  notes: 'Piste 4',
  scheduled_for: '2026-08-30T20:00:00.000Z',
  duration_min: 90,
  status: 'confirmed',
  created_by: 'user-1',
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-20T10:00:00Z',
};

const renderForm = (options: Partial<UsePlannedOutingEditFormOptions> = {}) =>
  renderHook(() =>
    usePlannedOutingEditForm(plannedOuting, {
      onSubmit: jest.fn(),
      isLoading: false,
      isDeleting: false,
      error: null,
      ...options,
    }),
  );

describe('usePlannedOutingEditForm', () => {
  it('starts from the step values', () => {
    const { result } = renderForm();

    expect(result.current.title).toBe('Bowling');
    expect(result.current.description).toBe('');
    expect(result.current.notes).toBe('Piste 4');
    expect(result.current.durationMin).toBe(90);
    expect(result.current.status).toBe('confirmed');
    expect(result.current.scheduledFor.toISOString()).toBe('2026-08-30T20:00:00.000Z');
    expect(result.current.isAnyLoading).toBe(false);
  });

  it('refuses an empty title', async () => {
    const onSubmit = jest.fn();
    const { result } = renderForm({ onSubmit });

    act(() => result.current.setTitle('   '));
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.displayError).toBe("Le nom de l'étape est obligatoire.");
  });

  it('submits trimmed values, with empty texts as null', async () => {
    const onSubmit = jest.fn();
    const { result } = renderForm({ onSubmit });

    act(() => {
      result.current.setTitle('  Billard  ');
      result.current.setNotes('   ');
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Billard',
      description: null,
      notes: null,
      scheduled_for: '2026-08-30T20:00:00.000Z',
      duration_min: 90,
      status: 'confirmed',
    });
  });

  it('deletes the step and closes the confirmation', async () => {
    const onDelete = jest.fn();
    const { result } = renderForm({ onDelete });

    act(() => result.current.setIsConfirmingDelete(true));
    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(onDelete).toHaveBeenCalledWith('po-1');
    expect(result.current.isConfirmingDelete).toBe(false);
  });

  it('derives the loading flags and shows the parent error', () => {
    const { result } = renderForm({ isLoading: true, isDeleting: true, error: 'Erreur réseau' });

    expect(result.current.isDeletingActive).toBe(true);
    expect(result.current.isSavingActive).toBe(false);
    expect(result.current.isAnyLoading).toBe(true);
    expect(result.current.displayError).toBe('Erreur réseau');
  });
});
